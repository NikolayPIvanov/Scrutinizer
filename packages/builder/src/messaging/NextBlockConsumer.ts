/* eslint-disable node/no-extraneous-import */
import {inject, injectable} from 'inversify';
import {infrastructure} from 'scrutinizer-infrastructure';
import {IExtendedKafkaMessage} from 'scrutinizer-infrastructure/build/src/messaging/kafka/consumers/consumers.interface';
import {IConfiguration} from '../configuration';
import {TYPES} from '../injection/types';
import {IProvider} from '../provider/provider.interfaces';

@injectable()
export class NextBlockConsumer extends infrastructure.messaging.BaseConsumer {
  private messages = new Map<string, number>();

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
      groupId: this.configuration.kafka.groups.blocks,
      topics: [this.configuration.kafka.topics.blocks.name],
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
      throw new Error('Message value is empty');
    }

    const {blockNumber} = JSON.parse(raw);
    if (Number.isNaN(blockNumber)) {
      throw new Error(`Block number is not a number: ${blockNumber}`);
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

    const cacheKey = `${message.topic}-${message.partition}-${message.offset}`;
    const processed = this.messages.get(cacheKey);
    if (processed === 1) {
      return;
    }

    if (processed === 0) {
      this.logger.info(`Uncommitted message ${cacheKey}`);
    }

    this.messages.set(
      `${message.topic}-${message.partition}-${message.offset}`,
      0
    );

    await this.kafkaClient.producer.send({
      topic: this.configuration.kafka.topics.blocksFull.name,
      messages: [
        {
          key: message.key,
          value: JSON.stringify(block),
          headers: {
            'x-origin': 'next-block-consumer',
            'x-original-message': `${message.topic}-${message.partition}-${message.offset}`,
          },
        },
      ],
    });

    this.messages.set(
      `${message.topic}-${message.partition}-${message.offset}`,
      1
    );
  };

  private handleError = (error: unknown) => {
    this.logger.error(error);
  };
}
