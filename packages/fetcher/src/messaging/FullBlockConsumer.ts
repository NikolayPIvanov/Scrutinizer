import {inject, injectable} from 'inversify';
import {IValidator} from '../Validator';
import {IConfiguration} from '../configuration/interfaces';
import {ILogger} from '../logger';
import {TYPES} from '../types';
import {
  IConsumer,
  IConsumerInstance,
  IExtendedKafkaMessage,
  IKafkaClient,
} from './kafka.interfaces';

@injectable()
export class FullBlockConsumer implements IConsumerInstance {
  constructor(
    @inject(TYPES.ILogger) private logger: ILogger,
    @inject(TYPES.IKafkaClient) private kafkaClient: IKafkaClient,
    @inject(TYPES.IValidator) private validator: IValidator,
    @inject(TYPES.IConfiguration) private configuration: IConfiguration,
    @inject(TYPES.IConsumer) private consumer: IConsumer
  ) {
    this.consumer.initialize({
      groupId: this.configuration.kafka.groups.fullBlock,
      topicsList: [this.configuration.kafka.topics.fullBlock],
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
    const raw = message.value?.toString();
    if (!raw) {
      return;
    }

    const {number, hash, parentHash} = JSON.parse(raw);

    this.validator.push({number: parseInt(number, 16), hash, parentHash});
  };
}
