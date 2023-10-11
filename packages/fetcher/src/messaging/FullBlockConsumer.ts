import {inject, injectable} from 'inversify';
// eslint-disable-next-line node/no-extraneous-import
import {infrastructure} from 'scrutinizer-infrastructure';
// eslint-disable-next-line node/no-extraneous-import
import {IExtendedKafkaMessage} from 'scrutinizer-infrastructure/build/src/messaging/kafka/consumers/consumers.interface';
import {IConfiguration} from '../configuration/interfaces';
import {TYPES} from '../injection/types';
import {IValidator} from '../validators/Validator';

@injectable()
export class FullBlockConsumer extends infrastructure.messaging.BaseConsumer {
  constructor(
    @inject(TYPES.IValidator) private validator: IValidator,
    @inject(TYPES.IConfiguration) private configuration: IConfiguration,
    @inject(TYPES.ILogger) logger: infrastructure.logging.ILogger,
    @inject(TYPES.ICommitManager)
    commitManager: infrastructure.messaging.ICommitManager,
    @inject(TYPES.IKafkaClient)
    kafkaClient: infrastructure.messaging.IKafkaClient
  ) {
    super(kafkaClient, commitManager, logger);

    this.initialize({
      groupId: this.configuration.kafka.groups.fullBlock,
      topics: [this.configuration.kafka.topics.fullBlock],
      autoCommit: false,
      consumerConfiguration: {
        maxParallelHandles: 50,
        maxQueueSize: 50,
        maxBytesPerPartition: 1000000,
        heartbeatInterval: 5000,
        commitInterval: 5000,
        autoCommit: false,
        fromBeginning: true,
        retryTopic: configuration.kafka.topics.fullBlockRetry,
        retryThreshold: 3,
        dlqTopic: configuration.kafka.topics.fullBlockDlq,
      },
      onMessageHandler: this.handle.bind(this),
      onErrorHandler: this.handleError.bind(this),
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

  private handleError = (error: unknown) => {
    this.logger.error(error);
  };
}
