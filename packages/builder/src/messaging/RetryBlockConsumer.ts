/* eslint-disable node/no-extraneous-import */

import {inject, injectable} from 'inversify';
import {CompressionTypes} from 'kafkajs';
import {infrastructure} from 'scrutinizer-infrastructure';
import {IExtendedKafkaMessage} from 'scrutinizer-infrastructure/build/src/messaging/kafka/consumers/consumers.interface';
import {IConfiguration} from '../configuration/interfaces';
import {TYPES} from '../injection/types';
import {IProvider} from '../provider/provider.interfaces';

@injectable()
export class RetryBlockConsumer extends infrastructure.messaging.BaseConsumer {
  constructor(
    @inject(TYPES.IProvider) private provider: IProvider,
    @inject(TYPES.IConfiguration) private configuration: IConfiguration,
    @inject(TYPES.ILogger) logger: infrastructure.logging.ILogger,
    @inject(TYPES.IRedisClient)
    redis: infrastructure.caching.redis.IRedisClient,
    @inject(TYPES.ICommitManager)
    commitManager: infrastructure.messaging.ICommitManager,
    @inject(TYPES.IKafkaClient)
    kafkaClient: infrastructure.messaging.IKafkaClient
  ) {
    super(kafkaClient, commitManager, logger, redis);

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
        retryThreshold: 3,
        dlqTopic: configuration.kafka.topics.blocksDlq.name,
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

    if (!block) {
      throw new Error(`Block ${blockNumber} not found`);
    }

    await this.kafkaClient.producer.send({
      compression: CompressionTypes.GZIP,
      topic: this.configuration.kafka.topics.blocksFull.name,
      messages: [
        {
          key: message.key,
          value: JSON.stringify(block),
          headers: {
            'x-origin': 'retry-block-consumer',
            'x-original-message': `${message.topic}-${message.partition}-${message.offset}`,
          },
        },
      ],
    });
  };

  private handleError = (error: unknown) => {
    this.logger.error(error, 'handleError');
  };
}
