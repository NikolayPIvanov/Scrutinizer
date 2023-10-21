// eslint-disable-next-line node/no-extraneous-import
import {inject, injectable} from 'inversify';
import {CompressionTypes} from 'kafkajs';
import {infrastructure} from 'scrutinizer-infrastructure';
import {to} from 'scrutinizer-infrastructure/build/src/common';
import {types} from '../../@types';
import {IConfiguration} from '../../configuration';
import {IDbQueries, IRawBlock} from '../../ksql';
import {IValidatorService} from './validator.interfaces';

@injectable()
export class ValidatorService implements IValidatorService {
  private previouslyConfirmedBlockNumber?: number;

  constructor(
    @inject(types.ILogger) private logger: infrastructure.logging.ILogger,
    @inject(types.IKafkaClient)
    private kafka: infrastructure.messaging.IKafkaClient,
    @inject(types.IConfiguration) private configuration: IConfiguration,
    @inject(types.IDbQueries) private dbQueries: IDbQueries
  ) {
    setInterval(
      async () => this.validateChainIntegrity(),
      this.configuration.validator.validatorInterval
    );
  }

  public async validateChainIntegrity(): Promise<void> {
    const [blocks, error] = await to(
      this.dbQueries.getBlocks(this.previouslyConfirmedBlockNumber)
    );
    if (blocks?.length === 0 || error) {
      return;
    }

    blocks?.sort((a, b) => a.blockNumber - b.blockNumber);

    const {forks, consecutiveBlocksAtStart} = this.findForks(blocks!);
    const confirmed = !forks.length
      ? this.findConfirmed(consecutiveBlocksAtStart, blocks!)
      : [];

    await this.sendBlockNumbersToKafka(forks, confirmed);

    if (confirmed.length > 0) {
      this.previouslyConfirmedBlockNumber = confirmed[confirmed.length - 1];
    }
  }

  /**
   * Finds forks in an array of raw blocks and counts consecutive blocks at the start.
   * @param blocks - An array of raw blocks to search for forks.
   * @returns An object containing an array of fork block numbers and the number of consecutive blocks at the start.
   */
  private findForks(blocks: IRawBlock[]) {
    const forks = [];
    let consecutiveBlocksAtStart = 0;

    for (let i = blocks.length - 1; i > 0; i--) {
      const currentBlock = blocks[i];
      const previousBlock = blocks[i - 1];
      const consecutive =
        currentBlock.blockNumber - 1 === previousBlock.blockNumber;
      const chainUnlinked = currentBlock.parentHash !== previousBlock.hash;
      consecutiveBlocksAtStart =
        consecutive && !chainUnlinked ? consecutiveBlocksAtStart + 1 : 0;

      if (consecutive && chainUnlinked) {
        forks.push(previousBlock.blockNumber);
      }
    }

    if (forks.length > 0) {
      this.logger.info(`Forks: ${forks.join(', ')}`);
    }

    return {forks, consecutiveBlocksAtStart};
  }

  private findConfirmed(
    consecutiveBlocksAtStart: number,
    blocks: IRawBlock[]
  ): number[] {
    if (
      consecutiveBlocksAtStart < this.configuration.validator.blocksThreshold
    ) {
      return [];
    }

    const take =
      consecutiveBlocksAtStart - this.configuration.validator.blocksThreshold;

    return blocks.slice(0, take).map(block => block.blockNumber);
  }

  private sendBlockNumbersToKafka = async (
    forkedBlockNumbers: number[] = [],
    confirmed: number[] = []
  ) => {
    try {
      await this.kafka.producer.sendBatch({
        compression: CompressionTypes.GZIP,
        topicMessages: [
          {
            topic: this.configuration.kafka.topics.blockNumbers.name,
            messages: forkedBlockNumbers.map(block => ({
              key: block.toString(),
              value: JSON.stringify({blockNumber: block}),
            })),
          },
          {
            topic: this.configuration.kafka.topics.forked.name,
            messages: forkedBlockNumbers.map(blockNumber => ({
              key: blockNumber.toString(),
              value: JSON.stringify({blockNumber}),
            })),
          },
          {
            topic: this.configuration.kafka.topics.confirmed.name,
            messages: confirmed.map(blockNumber => ({
              key: blockNumber.toString(),
              value: JSON.stringify({blockNumber}),
            })),
          },
        ],
      });
    } catch (error) {
      this.logger.error(error);
    }
  };
}
