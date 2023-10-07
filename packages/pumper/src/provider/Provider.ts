import {inject, injectable} from 'inversify';
import {to} from '../common';
import {IConfiguration} from '../configuration';
import {ILogger} from '../logger';
import {IKafkaClient} from '../messaging';
import {TYPES} from '../types';
import {EvmApi} from './EvmApi';
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

@injectable()
export class Provider implements IProvider {
  private providers: IEvmApi[] = [];
  private allProviders: IEvmApi[] = [];
  private latestBlock = 0;
  private blockLag = 0;
  private providerRpcConfiguration: ITransformedExtendedRpcInstance | undefined;
  private lastCommitted: number | undefined;

  constructor(
    @inject(TYPES.ILogger) private logger: ILogger,
    @inject(TYPES.IConfiguration) private configuration: IConfiguration,
    @inject(TYPES.IKafkaClient) private kafkaClient: IKafkaClient,
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

  private async loadProviders() {
    if (this.providerRpcConfiguration === undefined) {
      throw new Error('Missing configuration');
    }

    const providers = this.providerRpcConfiguration?.rpcs!.map(
      rpc =>
        new EvmApi(this.nodeStorageRepository, {
          endpoint: rpc,
          chainId: this.providerRpcConfiguration!.chainId!,
          chainName: this.providerRpcConfiguration!.name!,
        }) as unknown as IEvmApi
    );

    this.allProviders = await Promise.all(
      providers?.map(async provider => {
        if (
          this.providers.length >= this.configuration.network.maxProviderCount
        ) {
          return provider;
        }

        const [chainId, error] = await to(provider.getChainId());
        if (error) {
          return provider;
        }

        if (chainId === this.providerRpcConfiguration?.chainId) {
          this.providers.push(provider);
        }

        return provider;
      })
    );
  }

  private async start(lastCommitted: number) {
    await this.initializeBlockTimeCalculation(lastCommitted);

    this.initializePeriodicProviderRefresh();
    this.initializePeriodicBlockLag();
  }

  private initializeBlockTimeCalculation = async (lastCommitted: number) => {
    this.lastCommitted = lastCommitted;
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
    setInterval(() => {
      try {
        this.calculateBlockLagAndLatestBlock();

        if (this.blockLag > this.configuration.network.blockLagThreshold) {
          this.refreshProviders();
        }
      } catch (error) {
        this.logger.error(error);
      }
    }, this.configuration.network.blockTime * this.configuration.network.checkBlockLagIntervalMultiplier);
  };

  async getFullBlock(blockNumber: number, forcedProvider?: IEvmApi) {
    try {
      if (forcedProvider) {
        return forcedProvider.getFullBlock(blockNumber);
      }

      const promises = this.providers.map(provider => {
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
      this.logger.error(error);
    }

    throw new Error(
      `No valid block found! Chain: ${this.providerRpcConfiguration?.name}, block: ${blockNumber}, latest: ${this.latestBlock}}`
    );
  }

  async calculateBlockLagAndLatestBlock() {
    const promises = this.providers.map(provider => provider.getBlockNumber());
    const {success} = await requestMultiplePromisesWithTimeout(
      promises,
      this.configuration.network.maxRequestTime
    );

    if (success.length === 0) {
      return;
    }

    const latestBlock = getConsensusValue(success);
    if (!latestBlock) {
      return;
    }

    if (this.lastCommitted && this.lastCommitted < latestBlock) {
      const currentBlockLag = latestBlock - this.lastCommitted; // we need to catch up this many blocks
      const maxBlocksPerIteration = 25000;
      const blocksPerIteration = Math.min(
        currentBlockLag,
        maxBlocksPerIteration
      );

      const blocks = this.constructConsequentArray(
        blocksPerIteration,
        this.lastCommitted
      );

      this.verifyConsequentArray(blocks, this.lastCommitted);

      await this.sendBlockNumbersToKafka(blocks);

      if (currentBlockLag > maxBlocksPerIteration) {
        this.lastCommitted += maxBlocksPerIteration;
        return;
      }

      this.lastCommitted = undefined;

      return;
    }

    const currentBlockLag = latestBlock - this.latestBlock;
    if (this.latestBlock !== 0) {
      const blocks = this.constructConsequentArray(
        currentBlockLag,
        this.latestBlock
      );

      this.verifyConsequentArray(blocks, this.latestBlock);

      await this.sendBlockNumbersToKafka(blocks);
    }

    this.blockLag = currentBlockLag;
    if (latestBlock > this.latestBlock) {
      this.latestBlock = latestBlock;
    }
  }

  private constructConsequentArray = (length: number, start: number) =>
    [...Array(length)].map((_, i) => start + i + 1);

  private verifyConsequentArray = (arr: number[], pivot: number) => {
    if (arr[0] !== pivot + 1) {
      throw new Error('Invalid block calculation');
    }
  };

  private sendBlockNumbersToKafka = async (blocks: number[]) => {
    await this.kafkaClient.producer.sendBatch({
      acks: 1,
      compression: 0,
      topicMessages: [
        {
          topic: this.configuration.kafka.topics.blocks,
          messages: blocks.map(block => ({
            key: block.toString(),
            value: JSON.stringify({blockNumber: block}),
          })),
        },
      ],
    });

    this.logger.info(`Successfully sent ${blocks.length} block numbers`);
  };

  private async refreshProviders() {
    try {
      const availableProviders = this.allProviders.filter(
        e => !this.providers.find(k => k.endpointUrl === e.endpointUrl)
      );

      if (availableProviders.length < 1) {
        return;
      }

      if (
        this.providers.filter(e => e.errorCount > 0 || e.latency > 500)
          .length === 0
      ) {
        return;
      }

      this.providers.sort((a, b) => a.errorCount - b.errorCount);

      const nextProvider = availableProviders[0];

      const [, error] = await to(nextProvider.getBlock());
      if (error) {
        return;
      }

      const [chainId, err] = await to(nextProvider.getChainId());
      if (err) {
        return;
      }

      if (chainId === this.providerRpcConfiguration?.chainId) {
        this.providers.pop();

        this.providers.push(nextProvider);
      }
    } catch (error: unknown) {
      this.logger.error(`${(error as any).message!}`);
    }
  }
}
