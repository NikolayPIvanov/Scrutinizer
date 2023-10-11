import {QueueObject, queue} from 'async';
import {injectable} from 'inversify';
import {Batch, EachBatchPayload} from 'kafkajs';
import {to} from '../../../common';
import {ILogger} from '../../../logging';
import {IConsumer, IKafkaClient} from '../kafka.interfaces';
import {
  ICommitManager,
  IConsumerBootstrapConfiguration,
  IConsumerConfig as IConsumerConfiguration,
  IConsumerInstance,
  IExtendedKafkaMessage,
} from './consumers.interface';

@injectable()
export class BaseConsumer implements IConsumerInstance {
  private ready = false;
  private paused = false;

  private consumer?: IConsumer;
  private topicsList: string[] = [];
  private onMessageHandler?: (data: IExtendedKafkaMessage) => Promise<void>;
  private onErrorHandler?: (error: unknown) => void;
  private autoCommit = false;
  private queue?: QueueObject<IExtendedKafkaMessage>;

  constructor(
    protected kafkaClient: IKafkaClient,
    protected commitManager: ICommitManager,
    protected logger: ILogger
  ) {}

  public initialize = async (
    bootstrapConfiguration: IConsumerBootstrapConfiguration
  ) => {
    if (this.ready) return Promise.resolve();
    if (!bootstrapConfiguration.topics)
      throw new Error('No topics provided for consumer');

    this.createWorkerQueue(bootstrapConfiguration);
    this.initializeConsumerHandlers(bootstrapConfiguration);

    this.consumer = await this.createConsumer(bootstrapConfiguration);

    this.commitManager.start(bootstrapConfiguration.consumerConfiguration);
    this.ready = true;

    return this.consumer.run({
      eachBatch: this.createBatchHandler(bootstrapConfiguration),
    });
  };

  private createBatchHandler(
    bootstrapConfiguration: IConsumerBootstrapConfiguration
  ) {
    const eachBatch = async ({
      batch,
      resolveOffset,
      commitOffsetsIfNecessary,
      heartbeat,
      isRunning,
    }: EachBatchPayload) => {
      this.commitManager.setPartitionCallbacks({
        partition: batch.partition,
        resolveOffset,
        commitOffsetsIfNecessary,
        heartbeat,
        isRunning,
      });

      const handler = bootstrapConfiguration.consumerConfiguration
        .maxParallelHandles
        ? (extendedMessage: IExtendedKafkaMessage) => {
            this.queue?.push(extendedMessage);
            if (this.isQueueFull(bootstrapConfiguration)) {
              this.pausePartitionConsumer();
            }
          }
        : (extendedMessage: IExtendedKafkaMessage) =>
            this.handleCallback(
              extendedMessage,
              bootstrapConfiguration.consumerConfiguration,
              this.onMessageHandler
            );

      this.extendKafkaMessages(batch).forEach(extendedKafkaMessage =>
        handler(extendedKafkaMessage)
      );
    };

    return eachBatch;
  }

  private extendKafkaMessages(batch: Batch) {
    return batch.messages.map(
      message =>
        ({
          ...message,
          partition: batch.partition,
          topic: batch.topic,
          highWaterOffset: batch.highWatermark,
        }) as IExtendedKafkaMessage
    );
  }

  private isQueueFull(bootstrapConfiguration: IConsumerBootstrapConfiguration) {
    return (
      this.queue &&
      this.queue?.length() >
        bootstrapConfiguration.consumerConfiguration.maxQueueSize &&
      !this.paused
    );
  }

  private pausePartitionConsumer() {
    try {
      this.consumer?.pause(
        this.topicsList.map(topic => {
          return {topic};
        })
      );
    } catch (e) {
      this.logger.error('Pause err', e);
    } finally {
      this.paused = true;
    }
  }

  private async createConsumer(
    bootstrapConfiguration: IConsumerBootstrapConfiguration
  ) {
    const consumerConfiguration = {
      groupId: bootstrapConfiguration.groupId,
      maxBytesPerPartition:
        bootstrapConfiguration.consumerConfiguration.maxBytesPerPartition,
      heartbeatInterval:
        bootstrapConfiguration.consumerConfiguration.heartbeatInterval,
      fromBeginning: bootstrapConfiguration.consumerConfiguration.fromBeginning,
    };

    return this.kafkaClient.consumer(consumerConfiguration, {
      topics: bootstrapConfiguration.topics,
      fromBeginning: bootstrapConfiguration.consumerConfiguration.fromBeginning,
    });
  }

  private initializeConsumerHandlers(
    bootstrapConfiguration: IConsumerBootstrapConfiguration
  ) {
    this.topicsList = bootstrapConfiguration.topics;
    this.onMessageHandler =
      bootstrapConfiguration.onMessageHandler ||
      this.onMessageDefaultHandler.bind(this);
    this.onErrorHandler =
      bootstrapConfiguration.onErrorHandler || this.onErrorDefaultHandler;
    this.autoCommit = bootstrapConfiguration.autoCommit || false;
  }

  private createWorkerQueue(
    bootstrapConfiguration: IConsumerBootstrapConfiguration
  ) {
    if (!bootstrapConfiguration.consumerConfiguration.maxParallelHandles) {
      return;
    }

    this.queue = queue(async (data: IExtendedKafkaMessage, onFinished) => {
      await this.handleCallback(
        data,
        bootstrapConfiguration.consumerConfiguration,
        this.onMessageHandler
      );
      onFinished();
    }, bootstrapConfiguration.consumerConfiguration.maxParallelHandles);

    this.queue.drain(() => {
      if (this.paused) this.retryResume();
    });
  }

  private async handleCallback(
    extendedKafkaMessage: IExtendedKafkaMessage,
    configuration: IConsumerConfiguration,
    handler?: (message: IExtendedKafkaMessage) => Promise<void>
  ) {
    try {
      if (!handler) throw new Error('No handler provided');

      this.commitManager.notifyStartProcessing(extendedKafkaMessage);
      const [, error] = await to(handler(extendedKafkaMessage));
      if (error && this.onErrorHandler) {
        this.onErrorHandler(error);
        this.logger.error(`Error handling message: ${error}`);

        await this.retryMessage(extendedKafkaMessage, configuration);
      }
    } finally {
      this.commitManager.notifyFinishedProcessing(extendedKafkaMessage);
    }
  }

  private async retryMessage(
    extendedKafkaMessage: IExtendedKafkaMessage,
    configuration: IConsumerConfiguration
  ) {
    extendedKafkaMessage.headers = extendedKafkaMessage.headers || {};

    const retries = +(extendedKafkaMessage.headers.retries || 0);
    extendedKafkaMessage.headers.retries = (retries + 1).toString();
    extendedKafkaMessage.headers.originalTopic = extendedKafkaMessage.topic;

    if (+extendedKafkaMessage.headers.retries > configuration.retryThreshold) {
      this.logger.error(
        `Message exceeded retry limit: ${extendedKafkaMessage.topic}:${extendedKafkaMessage.partition}:${extendedKafkaMessage.offset}`
      );

      return to(
        this.kafkaClient.producer.send({
          acks: 1,
          topic: configuration.dlqTopic,
          messages: [extendedKafkaMessage],
        })
      );
    }

    const [, error] = await to(
      this.kafkaClient.producer.send({
        acks: 1,
        topic: configuration.retryTopic,
        messages: [extendedKafkaMessage],
      })
    );

    if (error) {
      this.logger.error(
        `Error has occurred while trying to produce to retry topic ${extendedKafkaMessage.topic}: ${error}`
      );
    }

    return;
  }

  private async onMessageDefaultHandler(data: IExtendedKafkaMessage) {
    this.logger.info(`Handling received message with offset: ${data.offset}`);
    return Promise.resolve();
  }

  private async onErrorDefaultHandler(error: unknown) {
    this.logger.error(error);

    return Promise.resolve();
  }

  // Sometimes resume fails due to re-balancing. We need to retry until success!
  private async retryResume() {
    const MAX_RETRIES = 5;
    let retries = 0;

    do {
      retries++;
      this.killApplicationOnResumeFailure(retries, MAX_RETRIES);

      const [, error] = await to(this.resumeTopics());
      if (error) {
        this.logger.error(
          `Error has occurred while trying to resume consumption: ${error}`
        );
      }
    } while (retries < MAX_RETRIES + 1 && this.paused);
  }

  private async resumeTopics() {
    if (!this.consumer) {
      throw new Error('Consumer not initialized');
    }

    if (!this.autoCommit) {
      await this.commitManager.commitProcessedOffsets();
    }

    this.consumer.resume(this.topicsList.map((topic: string) => ({topic})));
    this.paused = false;
    this.logger.info(
      `Resume successful for ${JSON.stringify(this.topicsList)}`
    );
  }

  private killApplicationOnResumeFailure(retries: number, MAX_RETRIES: number) {
    if (retries > MAX_RETRIES) {
      this.logger.error('Unable to resume consumption');
      process.kill(process.pid);
    }
  }
}
