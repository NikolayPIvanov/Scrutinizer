/* eslint-disable node/no-extraneous-import */

import {inject, injectable} from 'inversify';
import {infrastructure} from 'scrutinizer-infrastructure';
import {IExtendedKafkaMessage} from 'scrutinizer-infrastructure/build/src/messaging/kafka/consumers/consumers.interface';
import {IConfiguration} from '../configuration/interfaces';
import {TYPES} from '../injection/types';
import {IProvider} from '../provider/provider.interfaces';
import {getBlockAndBroadcast, validate} from './block.consumer.common';

@injectable()
export class RetryBlockConsumer extends infrastructure.messaging.BaseConsumer {
  constructor(
    @inject(TYPES.IProvider) private provider: IProvider,
    @inject(TYPES.IConfiguration) private configuration: IConfiguration,
    @inject(TYPES.ILogger) logger: infrastructure.logging.ILogger,
    @inject(TYPES.ICommitManager)
    commitManager: infrastructure.messaging.ICommitManager,
    @inject(TYPES.IKafkaClient)
    kafkaClient: infrastructure.messaging.IKafkaClient
  ) {
    super(kafkaClient, commitManager, logger);

    this.initialize({
      groupId: this.configuration.kafka.groups.blocksRetry,
      topics: [this.configuration.kafka.topics.blocksRetry.name],
      autoCommit: false,
      consumerConfiguration: {
        maxParallelHandles: 50,
        maxQueueSize: 50,
        maxBytesPerPartition: 1000000,
        heartbeatInterval: 5000,
        commitInterval: 5000,
        autoCommit: false,
        fromBeginning: true,
        retryTopic: configuration.kafka.topics.blocksRetry.name,
        retryThreshold: 300,
        dlqTopic: configuration.kafka.topics.blocksDlq.name,
      },
      onMessageHandler: this.handle.bind(this),
      onErrorHandler: this.handleError.bind(this),
    });
  }

  public handle = async (message: IExtendedKafkaMessage) => {
    const blockNumber = validate(message);

    await getBlockAndBroadcast({
      blockNumber,
      provider: this.provider,
      kafkaClient: this.kafkaClient,
      configuration: this.configuration,
      message,
      origin: 'retry',
    });
  };

  private handleError = (error: unknown) => {
    this.logger.error(error, 'handleError');
  };
}
