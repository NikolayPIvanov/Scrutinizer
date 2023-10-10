import { inject, injectable } from 'inversify';
import { IRedisClient } from './Redis';
import { IConfiguration } from './configuration';
import { ILogger } from './logger';
import { IKafkaClient } from './messaging';
import { IProvider } from './provider/provider.interfaces';
import { TYPES } from './types';

export interface IBlockRoot {
  number: number;
  hash: string;
  parentHash: string;
}

export interface IValidator {
  push(root: IBlockRoot): void;
  validate(): Promise<void>;
}

@injectable()
export class Validator implements IValidator {
  private roots: IBlockRoot[] = [];
  private uniqueRootsIndexes: Map<number, number> = new Map();
  private forks: Map<number, IBlockRoot> = new Map();
  private blocksCache: Map<number, any> = new Map();

  constructor(
    @inject(TYPES.ILogger) private logger: ILogger,
    @inject(TYPES.IKafkaClient) private kafkaClient: IKafkaClient,
    @inject(TYPES.IProvider) private provider: IProvider,
    @inject(TYPES.IConfiguration) private configuration: IConfiguration,
    @inject(TYPES.IRedisClient) private redis: IRedisClient
  ) {
    setInterval(async () => this.validate(), 5000);
    // setInterval(async () => this.validateOnChain(), 60000);
  }

  async push(root: IBlockRoot): Promise<void> {
    this.forks.delete(root.number);

    await this.redis.hSet(root.number.toString(), root);

    if (this.uniqueRootsIndexes.has(root.number)) {
      const index = this.uniqueRootsIndexes.get(root.number)!;
      this.roots[index] = root;

      return;
    }

    const length = this.roots.push(root);
    this.uniqueRootsIndexes.set(root.number, length - 1);

    if (this.roots.length > 1000) {
      this.roots.sort((a, b) => a.number - b.number); //sort every time, should update

      const removed = this.roots.shift();
      if (removed) {
        this.uniqueRootsIndexes.delete(removed.number);
      }
    }
  }

  async validate(): Promise<void> {
    const rootsCopy = [...this.roots].sort((a, b) => a.number - b.number);

    const forks = [];
    for (let i = rootsCopy.length - 1; i > 0; i--) {
      const root = rootsCopy[i];
      const prevRoot = rootsCopy[i - 1];
      if (
        root.number - 1 === prevRoot.number &&
        root.parentHash !== prevRoot.hash
      ) {
        this.forks.set(root.number, root);

        forks.push(root.number);
        forks.push(prevRoot.number);

        this.logger.info(`Fork found at ${prevRoot.number}`);
      }
    }

    if (forks.length > 0) {
      this.logger.info(`Forks: ${forks.join(', ')}`);
      await this.sendBlockNumbersToKafka(forks);
    }
    // Start from the end and traverse back.
    // If there is a gap in numbers, skip because it will come later.
    // If current's parent is not the previous, mark it as possible fork.
    // Get all marked forks and send them for processing. Remove them from the list.
    // Keep them until they are not received again.
  }

  async validateOnChain(): Promise<void> {
    const rootsCopy = [...this.roots].sort((a, b) => a.number - b.number);

    for (let i = rootsCopy.length - 1; i > 0; i--) {
      const root = rootsCopy[i];
      const prevRoot = rootsCopy[i - 1];
      if (root.number - 1 === prevRoot.number) {
        const cached = this.blocksCache.get(root.number);
        const block = cached ?? (await this.provider.getFullBlock(root.number));

        if (!cached && block) {
          this.blocksCache.set(root.number, block);
        }

        if (
          root.hash !== block?.hash.toLowerCase() ||
          root.parentHash !== block?.parentHash.toLowerCase()
        ) {
          this.logger.info(`Fork found at ${root.number}`);
          await this.sendBlockNumbersToKafka([root.number]);
        }
      }
    }
  }

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
        {
          topic: 'scrutinizer.fork.blocks',
          messages: blocks.map(block => ({
            key: block.toString(),
            value: JSON.stringify({blockNumber: block}),
          })),
        },
      ],
    });

    this.logger.info(`Successfully sent ${blocks.length} block numbers`);
  };
}
