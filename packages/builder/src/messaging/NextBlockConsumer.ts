import {inject, injectable} from 'inversify';
import {IConfiguration} from '../configuration/interfaces';
import {IProvider} from '../provider/provider.interfaces';
import {TYPES} from '../types';
import {
  IConsumer,
  IConsumerInstance,
  IExtendedKafkaMessage,
  IKafkaClient,
} from './kafka.interfaces';

@injectable()
export class NextBlockConsumer implements IConsumerInstance {
  constructor(
    @inject(TYPES.IProvider) private provider: IProvider,
    @inject(TYPES.IKafkaClient) private kafkaClient: IKafkaClient,
    @inject(TYPES.IConfiguration) private configuration: IConfiguration,
    @inject(TYPES.IConsumer) private consumer: IConsumer
  ) {
    this.consumer.initialize({
      groupId: this.configuration.kafka.groups.blocks,
      topicsList: [this.configuration.kafka.topics.blocks.name],
      autoCommit: false,
      config: {
        maxBytesPerPartition: 1000000,
        heartbeatInterval: 5000,
        fromBeginning: true,
        maxParallelHandles: 2000,
        maxQueueSize: 5000,
        retryTopic: configuration.kafka.topics.retryBlocks.name,
      },
      onData: this.handle.bind(this),
    });
  }

  public handle = async (message: IExtendedKafkaMessage) => {
    const raw = message.value?.toString();
    if (!raw) {
      return;
    }

    const {blockNumber} = JSON.parse(raw);

    if (Number.isNaN(blockNumber)) {
      return;
    }

    const lag = +message.highWaterOffset - +message.offset;
    const forceFastestProvider = lag > 10;

    const block = await this.provider.getBlock(
      blockNumber,
      forceFastestProvider
    );

    await this.kafkaClient.producer.send({
      acks: 1,
      topic: this.configuration.kafka.topics.fullBlock.name,
      messages: [
        {
          key: message.key,
          value: JSON.stringify(block),
        },
      ],
    });
  };
}
