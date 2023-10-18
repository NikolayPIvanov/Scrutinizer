/* eslint-disable node/no-extraneous-import */
import {infrastructure} from 'scrutinizer-infrastructure';
import {to} from 'scrutinizer-infrastructure/build/src/common';

import {inject, injectable} from 'inversify';
import {CompressionTypes} from 'kafkajs';
import {IConfiguration} from '../configuration';
import {TYPES} from '../injection/types';
import {
  IEvmApi,
  INodeStorageRepository,
  IProvider,
} from './provider.interfaces';
import {ITransformedExtendedRpcInstance} from './scrapers/scraper.interfaces';
import {requestMultiplePromisesWithTimeout} from './utils';

export const getConsensusValue = (arr: number[]): number => {
  const frequency = new Map();
  let maxCount = 0;
  let consensusValue = 0;

  if (arr.length === 0) {
    throw new Error('Cannot get consensus value of empty array');
  }

  for (const value of arr) {
    const count = frequency.get(value) || 0;
    frequency.set(value, count + 1);

    if (count + 1 > maxCount) {
      maxCount = count + 1;
      consensusValue = value;
    }
  }

  return consensusValue;
};

const maxBlocksPerIteration = 25000;

@injectable()
export class Provider implements IProvider {
  private currentProviders: IEvmApi[] = [];
  private allAvailableProviders: IEvmApi[] = [];
  private providerRpcConfiguration: ITransformedExtendedRpcInstance | undefined;
  private blockLag = 0;
  private lastSentNumber = 0;

  constructor(
    @inject(TYPES.ILogger) private logger: infrastructure.logging.ILogger,
    @inject(TYPES.IConfiguration) private configuration: IConfiguration,
    @inject(TYPES.IKafkaClient)
    private kafkaClient: infrastructure.messaging.IKafkaClient,
    @inject(TYPES.INodeStorageRepository)
    private nodeStorageRepository: INodeStorageRepository
  ) {}

  public initialize = async (
    providerRpcConfiguration: ITransformedExtendedRpcInstance,
    lastCommitted = 0
  ) => {
    this.providerRpcConfiguration = providerRpcConfiguration;

    await this.loadProviders();

    this.start(lastCommitted);
  };

  private async start(lastCommitted: number) {
    await this.initializeBlockTimeCalculation(lastCommitted);

    this.initializePeriodicProviderRefresh();
    this.initializePeriodicBlockLag();
  }

  private initializeBlockTimeCalculation = async (lastCommitted: number) => {
    this.lastSentNumber = lastCommitted;
    const [, error] = await to(this.calculateBlockLagAndLatestBlock());
    if (error) {
      this.logger.error('calculateBlockTime', error);
    }
  };

  private initializePeriodicProviderRefresh = () =>
    setInterval(
      () => this.refreshProviders(),
      this.configuration.network.refreshProvidersInterval
    );

  private initializePeriodicBlockLag = () => {
    let calculatingLag = false;
    setInterval(async () => {
      try {
        if (calculatingLag) {
          return;
        }

        calculatingLag = true;
        await this.calculateBlockLagAndLatestBlock();

        if (this.blockLag > this.configuration.network.blockLagThreshold) {
          this.refreshProviders();
        }
      } catch (error) {
        this.logger.error(error, 'initializePeriodicBlockLag');
      } finally {
        calculatingLag = false;
      }
    }, this.configuration.network.blockTime * this.configuration.network.checkBlockLagIntervalMultiplier);
  };

  async getFullBlock(blockNumber: number, forcedProvider?: IEvmApi) {
    try {
      if (forcedProvider) {
        return forcedProvider.getFullBlock(blockNumber);
      }

      const promises = this.currentProviders.map(provider => {
        return provider.getFullBlock(blockNumber);
      });

      const {success} = await requestMultiplePromisesWithTimeout(
        promises,
        this.configuration.network.maxRequestTime
      );

      const validated = success
        .filter(
          e => !!e?.number && !!e?.timestamp && !!e?.transactions && !!e?.txLogs
        )
        .sort((a, b) => b.txLogs?.length - a.txLogs?.length);

      const bestBlock = validated.find(
        block =>
          !!block?.number &&
          !!block?.timestamp &&
          block?.transactions?.length > 0 &&
          block?.txLogs?.length > 0
      );

      if (bestBlock?.number) {
        return bestBlock;
      }

      if (validated[0]?.number) {
        return validated[0];
      }
    } catch (error) {
      this.logger.error(error, 'getFullBlock');
    }

    this.logger.error(
      `No valid block found! Chain: ${this.providerRpcConfiguration?.name}, block: ${blockNumber}`
    );

    return null;
  }

  /**
   * Calculates the block lag and latest block on the blockchain.
   * Latest block is the highest block number returned by the providers.
   * A consensus value is calculated from the providers where the most common block number is returned.
   * Block lag is the difference between the latest block and the last committed block.
   */
  async calculateBlockLagAndLatestBlock() {
    // Get the block number from the providers.
    const blockNumber = await this.getBlockNumber();
    if (!blockNumber) {
      return;
    }

    // Set the pivot so we can have a starting point for the block lag calculation.
    const pivot = this.lastSentNumber || blockNumber;
    const lag = blockNumber - pivot;
    const blocksPerIteration = Math.min(lag, maxBlocksPerIteration);
    if (blocksPerIteration === 0) {
      this.lastSentNumber = blockNumber;
      return;
    }

    const blockNumbers = this.constructConsequentArray(
      blocksPerIteration,
      pivot
    );

    // First send the block numbers to Kafka.
    await this.sendBlockNumbersToKafka(blockNumbers);

    // Then calculate the block lag.
    this.blockLag = lag - blocksPerIteration;

    // Set the last sent number to the last block number sent to Kafka.
    // This is order to avoid missing on blocks in case of node immediately shutting down.
    this.lastSentNumber = blockNumbers[blockNumbers.length - 1];
  }

  private async getBlockNumber(): Promise<number | null> {
    const promises = this.currentProviders.map(provider =>
      provider.getBlockNumber()
    );
    const {success} = await requestMultiplePromisesWithTimeout(
      promises,
      this.configuration.network.maxRequestTime
    );

    if (success.length === 0) {
      this.logger.error('No valid block number found');

      return null;
    }

    const block = getConsensusValue(success);
    if (!block) {
      this.logger.error('No valid block number found');

      return null;
    }

    return block;
  }

  private constructConsequentArray = (length: number, start: number) => {
    const sequence = [...Array(length)].map((_, i) => start + i + 1);
    this.verifyConsequentArray(sequence, start);

    return sequence;
  };

  private verifyConsequentArray = (arr: number[], pivot: number) => {
    if (arr[0] !== pivot + 1) {
      throw new Error(`Invalid block calculation ${arr.join(', ')}`);
    }
  };

  private sendBlockNumbersToKafka = async (blocks: number[]) => {
    await this.kafkaClient.producer.send({
      compression: CompressionTypes.GZIP,
      topic: this.configuration.kafka.topics.blockNumbers.name,
      messages: blocks.map(block => ({
        key: block.toString(),
        value: JSON.stringify({blockNumber: block}),
      })),
    });

    this.logger.info(`Successfully sent ${blocks.join(' ')} block numbers`);
  };
}
