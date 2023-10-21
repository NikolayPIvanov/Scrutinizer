/* eslint-disable node/no-extraneous-import */
import {inject, injectable} from 'inversify';
import {CompressionTypes} from 'kafkajs';
import {ILogger} from 'scrutinizer-infrastructure/build/src/logging';
import {IKafkaClient} from 'scrutinizer-infrastructure/build/src/messaging';
import {IProvider} from 'scrutinizer-provider';
import {types} from '../../@types';
import {IConfiguration} from '../../configuration';
import {IDbQueries} from '../../ksql';
import {MaxBlocksPerIteration} from './lag.constants';
import {ILagCalculatorService} from './lag.interfaces';

@injectable()
export class LagCalculatorService implements ILagCalculatorService {
  private previouslyCommittedBlockNumber = 0;
  private isCalculatingLag = false;
  private provider?: IProvider;
  private readonly blockLagCalculationInterval: number;

  constructor(
    @inject(types.ILogger) private logger: ILogger,
    @inject(types.IKafkaClient) private kafka: IKafkaClient,
    @inject(types.IConfiguration) private configuration: IConfiguration,
    @inject(types.IDbQueries) private queries: IDbQueries
  ) {
    this.blockLagCalculationInterval =
      this.configuration.network.blockTime *
      this.configuration.network.checkBlockLagIntervalMultiplier;
  }

  public initializePeriodicBlockLagCalculation = async (
    provider: IProvider
  ) => {
    this.provider = provider;
    await this.setPreviouslyCommittedBlockNumber();

    setInterval(
      async () => this.singleInstanceBlockLagCalculation(),
      this.blockLagCalculationInterval
    );
  };

  private async setPreviouslyCommittedBlockNumber() {
    const previouslyCommittedBlockNumber =
      await this.queries.getLatestCommittedBlockNumber();
    this.previouslyCommittedBlockNumber = previouslyCommittedBlockNumber;
  }

  private async singleInstanceBlockLagCalculation() {
    try {
      if (this.isCalculatingLag) {
        return;
      }

      this.isCalculatingLag = true;
      await this.calculateBlockLag();
    } catch (error) {
      this.logger.error(error, 'initializePeriodicBlockLag');
    } finally {
      this.isCalculatingLag = false;
    }
  }

  /**
   * Calculates the block lag and latest block on the blockchain.
   * Latest block is the highest block number returned by the providers.
   * A consensus value is calculated from the providers where the most common block number is returned.
   * Block lag is the difference between the latest block and the last committed block.
   */
  private async calculateBlockLag() {
    if (!this.provider) {
      return;
    }

    // Get the block number from the providers.
    const latest = await this.provider.api.getBlockNumber();
    if (!latest) {
      return;
    }

    // Set the pivot so we can have a starting point for the block lag calculation.
    const startingBlockNumber = this.previouslyCommittedBlockNumber || latest;
    const lag = latest - startingBlockNumber;

    return this.handleBlockLag(lag, latest, startingBlockNumber);
  }

  private handleBlockLag = async (
    lag: number,
    latest: number,
    startingBlockNumber: number
  ) => {
    const blocksPerIteration = Math.min(lag, MaxBlocksPerIteration);
    if (blocksPerIteration === 0) {
      this.previouslyCommittedBlockNumber = latest;
      return;
    }

    const blockNumbers = this.constructConsequentBlockNumbers(
      blocksPerIteration,
      startingBlockNumber
    );

    // First send the block numbers to Kafka.
    await this.broadcast(blockNumbers);

    // Set the last sent number to the last block number sent to Kafka.
    this.previouslyCommittedBlockNumber = blockNumbers[blockNumbers.length - 1];
  };

  private constructConsequentBlockNumbers = (length: number, start: number) => {
    return [...Array(length)].map((_, i) => start + i + 1);
  };

  private broadcast = async (blocks: number[]) => {
    await this.kafka.producer.send({
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
