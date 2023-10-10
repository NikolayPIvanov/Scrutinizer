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
export class FullBlockRetryConsumer implements IConsumerInstance {
  constructor(
    @inject(TYPES.IProvider) private provider: IProvider,
    @inject(TYPES.IKafkaClient) private kafkaClient: IKafkaClient,
    @inject(TYPES.IConfiguration) private configuration: IConfiguration,
    @inject(TYPES.IConsumer) private consumer: IConsumer
  ) {
    this.consumer.initialize({
      groupId: this.configuration.kafka.groups.retryFullBlock,
      topicsList: [this.configuration.kafka.topics.fullBlockRetry],
      autoCommit: false,
      config: {
        maxBytesPerPartition: 1000000,
        heartbeatInterval: 5000,
        fromBeginning: true,
        maxParallelHandles: 50,
        maxQueueSize: 50,
        retryTopic: configuration.kafka.topics.fullBlockRetry,
      },
      onData: this.handle.bind(this),
    });
  }

  public handle = async (message: IExtendedKafkaMessage) => {
    console.log(message);
  };
}
