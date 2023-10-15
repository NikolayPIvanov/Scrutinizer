// eslint-disable-next-line node/no-extraneous-import
import {inject, injectable} from 'inversify';
import {CompressionTypes} from 'kafkajs';
import {infrastructure} from 'scrutinizer-infrastructure';
import {to} from 'scrutinizer-infrastructure/build/src/common';
import {IConfiguration} from '../configuration';
import {TYPES} from '../injection/types';
import {IBlockTrace, IDbQueries} from '../ksql/ksql.interfaces';
import {IBlockRoot, IValidator} from './validator.interfaces';

@injectable()
export class Validator implements IValidator {
  private lastConfirmedBlockNumber?: number;

  constructor(
    @inject(TYPES.ILogger) private logger: infrastructure.logging.ILogger,
    @inject(TYPES.IKafkaClient)
    private kafkaClient: infrastructure.messaging.IKafkaClient,
    @inject(TYPES.IConfiguration) private configuration: IConfiguration,
    @inject(TYPES.IDbQueries) private dbQueries: IDbQueries
  ) {
    setInterval(
      async () => this.validateChainIntegrity(),
      this.configuration.validator.validatorInterval
    );
  }

  public async validateChainIntegrity(): Promise<void> {
    const [blocks, error] = await to(
      this.dbQueries.getBlocks(this.lastConfirmedBlockNumber)
    );
    if (blocks?.length === 0 || error) {
      return;
    }

    blocks?.sort((a, b) => a.number - b.number);

    const {forks, consecutiveBlocksAtStart} = this.findForks(blocks!);
    const confirmed = !forks.length
      ? this.findConfirmed(consecutiveBlocksAtStart, blocks!)
      : [];

    await this.sendBlockNumbersToKafka(forks, confirmed);

    if (confirmed.length > 0) {
      this.lastConfirmedBlockNumber = confirmed[confirmed.length - 1];
    }
  }

  private findForks(blocks: IBlockTrace[]) {
    const forks = [];
    let consecutiveBlocksAtStart = 0;
    // Find forks. Count consecutive blocks at start.
    for (let i = blocks.length - 1; i > 0; i--) {
      const currentBlock = blocks[i];
      const previousBlock = blocks[i - 1];
      const consecutive = currentBlock.number - 1 === previousBlock.number;
      const chainUnlinked = currentBlock.parentHash !== previousBlock.hash;
      consecutiveBlocksAtStart =
        consecutive && !chainUnlinked ? consecutiveBlocksAtStart + 1 : 0;

      if (consecutive && chainUnlinked) {
        forks.push(previousBlock.number);
      }
    }

    if (forks.length > 0) {
      this.logger.info(`Forks: ${forks.join(', ')}`);
    }

    return {forks, consecutiveBlocksAtStart};
  }

  private findConfirmed(
    consecutiveBlocksAtStart: number,
    blocks: IBlockRoot[]
  ): number[] {
    if (
      consecutiveBlocksAtStart < this.configuration.validator.blocksThreshold
    ) {
      return [];
    }

    const confirmed = blocks
      .slice(
        0,
        consecutiveBlocksAtStart - this.configuration.validator.blocksThreshold
      )
      .map(block => block.number);

    return confirmed;
  }

  private sendBlockNumbersToKafka = async (
    forkedBlockNumbers: number[] = [],
    confirmed: number[] = []
  ) => {
    try {
      await this.kafkaClient.producer.sendBatch({
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
