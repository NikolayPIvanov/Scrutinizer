// eslint-disable-next-line node/no-extraneous-import
import {inject, injectable} from 'inversify';
import {CompressionTypes} from 'kafkajs';
import {infrastructure} from 'scrutinizer-infrastructure';
import {IConfiguration} from '../configuration';
import {TYPES} from '../injection/types';

export interface IBlockRoot {
  number: number;
  hash: string;
  parentHash: string;
}

export interface IValidator {
  push(root: IBlockRoot): void;
  validateChainIntegrity(): Promise<void>;
}

const BLOCKS_THRESHOLD = 200;

@injectable()
export class Validator implements IValidator {
  private blocks: IBlockRoot[] = [];
  private uniqueBlocks: Map<number, boolean> = new Map();
  private lastSorted?: number;

  constructor(
    @inject(TYPES.ILogger) private logger: infrastructure.logging.ILogger,
    @inject(TYPES.IKafkaClient)
    private kafkaClient: infrastructure.messaging.IKafkaClient,
    @inject(TYPES.IConfiguration) private configuration: IConfiguration,
    @inject(TYPES.IRedisClient)
    private redis: infrastructure.caching.redis.IRedisClient
  ) {
    setInterval(async () => this.validateChainIntegrity(), 5000);
  }

  async push(block: IBlockRoot): Promise<void> {
    // Store block in redis.
    await this.redis.hSet(this.getCacheKey(block.number), block);

    // If block is already in the list, replace it.
    if (this.uniqueBlocks.has(block.number)) {
      const index = this.blocks.findIndex(b => b.number === block.number);
      this.blocks[index] = block;

      return;
    }

    // Add Block to list.
    this.blocks.push(block);

    // Add block to map.
    this.uniqueBlocks.set(block.number, true);
  }

  async validateChainIntegrity(): Promise<void> {
    if (this.blocks.length === 0) {
      return;
    }

    const blocks = this.sortBlocks(this.blocks);
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

    // These are the valid chain at the beginning of the list.
    // const confirmedBlocks = await this.detectConfirmed(
    //   consecutiveBlocksAtStart,
    //   blocks
    // );

    if (forks.length > 0) {
      this.logger.info(`Forks: ${forks.join(', ')}`);
    }

    await this.sendBlockNumbersToKafka(forks, []);
  }

  private async detectConfirmed(
    consecutiveBlocksAtStart: number,
    blocks: IBlockRoot[]
  ): Promise<IBlockRoot[]> {
    const confirmedBlocks = [];
    if (consecutiveBlocksAtStart >= BLOCKS_THRESHOLD) {
      // Get the confirmed blocks, the consecutive list at the beginning of the list.
      // We subtract the threshold to get the confirmed blocks.
      // E.g 1,2,3,4,5,6,7,8,9,10,12,15,200
      // We have 10 consecutive blocks at the beginning of the list.
      // We subtract the threshold to get the confirmed blocks.
      // If threshold is 6 blocks, we get 4 confirmed blocks.
      // 1,2,3,4 elements, which are at indexes 0,1,2,3 (10 - 6 = 4 (non-inclusive)))
      confirmedBlocks.push(
        ...blocks.slice(0, consecutiveBlocksAtStart - BLOCKS_THRESHOLD)
      );

      // Remove confirmed blocks from redis.

      await this.redis.del(
        confirmedBlocks.map(block => this.getCacheKey(block.number))
      );

      // Remove confirmed blocks from the list.
      for (let i = 0; i < confirmedBlocks.length; i++) {
        const removed = this.blocks.shift();
        if (removed) {
          this.uniqueBlocks.delete(removed.number);
        }
      }
    }

    return confirmedBlocks;
  }

  private sortBlocks(roots: IBlockRoot[]): IBlockRoot[] {
    // Sort every 10 seconds at most.
    if (!this.lastSorted || Date.now() - this.lastSorted > 10000) {
      this.lastSorted = Date.now();

      return roots.sort((a, b) => a.number - b.number);
    }

    return this.blocks;
  }

  private sendBlockNumbersToKafka = async (
    forkedBlockNumbers: number[] = [],
    confirmed: IBlockRoot[] = []
  ) => {
    await this.kafkaClient.producer.sendBatch({
      compression: CompressionTypes.GZIP,
      topicMessages: [
        {
          topic: this.configuration.kafka.topics.blocks,
          messages: forkedBlockNumbers.map(block => ({
            key: block.toString(),
            value: JSON.stringify({blockNumber: block}),
          })),
        },
        {
          topic: this.configuration.kafka.topics.forks,
          messages: forkedBlockNumbers.map(block => ({
            key: block.toString(),
            value: JSON.stringify({blockNumber: block}),
          })),
        },
        {
          topic: this.configuration.kafka.topics.confirmed,
          messages: confirmed.map(block => ({
            key: block.number.toString(),
            value: JSON.stringify(block),
          })),
        },
      ],
    });
  };

  private getCacheKey = (blockNumber: number) => `block-${blockNumber}`;
}
