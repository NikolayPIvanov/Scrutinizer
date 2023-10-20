/* eslint-disable node/no-extraneous-import */
import {inject, injectable} from 'inversify';
import {CompressionTypes} from 'kafkajs';
import {ILogger} from 'scrutinizer-infrastructure/build/src/logging';
import {IKafkaClient} from 'scrutinizer-infrastructure/build/src/messaging';
import {IProvider} from 'scrutinizer-provider';
import {IConfiguration} from '../configuration';
import {TYPES} from '../injection/types';
import {IDbQueries} from '../ksql';
import {ILagCalculatorService} from './services.interfaces';

const maxBlocksPerIteration = 30000;

@injectable()
export class LagCalculatorService implements ILagCalculatorService {
  private previousLatest = 0;
  private calculatingLag = false;
  private provider?: IProvider;

  constructor(
    @inject(TYPES.ILogger) private logger: ILogger,
    @inject(TYPES.IKafkaClient) private kafkaClient: IKafkaClient,
    @inject(TYPES.IConfiguration) private configuration: IConfiguration,
    @inject(TYPES.IDbQueries) private dbQueries: IDbQueries
  ) {}

  public initializePeriodicBlockLag = async (provider: IProvider) => {
    this.provider = provider;
    const previousLatest = await this.dbQueries.getLatestCommittedBlockNumber();
    this.previousLatest = previousLatest;

    setInterval(async () => {
      try {
        if (this.calculatingLag) {
          return;
        }

        this.calculatingLag = true;
        await this.calculateBlockLagAndLatestBlock();
      } catch (error) {
        this.logger.error(error, 'initializePeriodicBlockLag');
      } finally {
        this.calculatingLag = false;
      }
    }, this.configuration.network.blockTime * this.configuration.network.checkBlockLagIntervalMultiplier);
  };

  /**
   * Calculates the block lag and latest block on the blockchain.
   * Latest block is the highest block number returned by the providers.
   * A consensus value is calculated from the providers where the most common block number is returned.
   * Block lag is the difference between the latest block and the last committed block.
   */
  private async calculateBlockLagAndLatestBlock() {
    if (!this.provider) {
      return;
    }
    // Get the block number from the providers.
    const latest = await this.provider.api.getBlockNumber();
    if (!latest) {
      return;
    }

    // Set the pivot so we can have a starting point for the block lag calculation.
    const pivot = this.previousLatest || latest;
    const lag = latest - pivot;
    const blocksPerIteration = Math.min(lag, maxBlocksPerIteration);
    if (blocksPerIteration === 0) {
      this.previousLatest = latest;
      return;
    }

    const blockNumbers = this.constructConsequentArray(
      blocksPerIteration,
      pivot
    );

    // First send the block numbers to Kafka.
    await this.sendBlockNumbersToKafka(blockNumbers);

    // Set the last sent number to the last block number sent to Kafka.
    // This is order to avoid missing on blocks in case of node immediately shutting down.
    this.previousLatest = blockNumbers[blockNumbers.length - 1];
  }

  private constructConsequentArray = (length: number, start: number) => {
    return [...Array(length)].map((_, i) => start + i + 1);
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
