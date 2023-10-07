import {inject, injectable} from 'inversify';
import {Consumer, KafkaMessage} from 'kafkajs';
import {IConfiguration} from '../configuration';
import {ILogger} from '../logger';
import {IProvider} from '../provider/provider.interfaces';
import {TYPES} from '../types';
import {IConsumer, IKafkaClient} from './kafka.interfaces';

@injectable()
export class BlockNumberConsumer implements IConsumer {
  private consumer?: Consumer;

  constructor(
    @inject(TYPES.IKafkaClient) private kafkaClient: IKafkaClient,
    @inject(TYPES.IConfiguration) private configuration: IConfiguration,
    @inject(TYPES.ILogger) private logger: ILogger,
    @inject(TYPES.IProvider) private provider: IProvider
  ) {}

  initialize = async () => {
    this.consumer = await this.kafkaClient.consumer(
      {
        groupId: this.configuration.kafka.groups.blocks,
      },
      this.configuration.kafka.topics.blocks
    );

    await this.consumer.run({
      eachMessage: async ({message, heartbeat}) =>
        this.handle({message, heartbeat}),
    });
  };

  private handle = async ({
    message,
    heartbeat,
  }: {
    message: KafkaMessage;
    heartbeat: () => Promise<void>;
  }) => {
    const raw = message.value?.toString();
    if (!raw) {
      this.logger.error(
        `Received empty block number, offset ${message.offset}`
      );
      return;
    }

    const {blockNumber} = JSON.parse(raw);

    if (Number.isNaN(blockNumber)) {
      this.logger.error(
        `Block number ${blockNumber} is not a number, offset ${message.offset}`
      );
      return;
    }

    const block = await this.provider.getBlock(blockNumber);

    this.logger.info(block);
  };
}
