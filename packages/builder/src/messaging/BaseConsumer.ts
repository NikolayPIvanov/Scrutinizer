import {QueueObject, queue} from 'async';
import {inject, injectable} from 'inversify';
import {Consumer, EachBatchPayload} from 'kafkajs';
import {to} from '../common';
import {ILogger} from '../logger';
import {TYPES} from '../types';
import {
  ICommitManager,
  IConsumer,
  IConsumerConfig,
  IExtendedKafkaMessage,
  IKafkaClient,
} from './kafka.interfaces';

@injectable()
export class BaseConsumer<T extends IExtendedKafkaMessage>
  implements IConsumer
{
  private consumer?: Consumer;
  private ready = false;
  private paused = false;
  private topicsList: string[] = [];
  private onData?: (data: IExtendedKafkaMessage) => Promise<void>;
  private onError = (error: unknown) => {};
  private autoCommit = false;
  private queue?: QueueObject<unknown>;

  constructor(
    @inject(TYPES.IKafkaClient) private kafkaClient: IKafkaClient,
    @inject(TYPES.ILogger) private logger: ILogger,
    @inject(TYPES.ICommitManager) private commitManager: ICommitManager
  ) {}

  public initialize = async ({
    groupId,
    topicsList,
    onData,
    onError,
    autoCommit,
    config,
  }: {
    groupId: string;
    topicsList: string[];
    autoCommit: boolean;
    config: IConsumerConfig;
    onData: (data: IExtendedKafkaMessage) => Promise<void>;
    onError?: (error: unknown) => void;
  }) => {
    if (config.maxParallelHandles) {
      this.queue = queue(async (data: T, done) => {
        await this.handleCB(data, config, this.onData);
        done();
      }, config.maxParallelHandles);

      this.queue.drain(() => {
        if (this.paused) this.retryResume();
      });
    }

    if (this.ready) return Promise.resolve();

    if (!topicsList) return Promise.reject('Cannot start without a topic list');

    this.topicsList = topicsList;
    this.onData = onData || this.defaultOnData.bind(this);
    this.onError = onError || this.defaultOnError;
    this.autoCommit = autoCommit || false;

    const consumerConfig = {
      groupId: groupId,
      maxBytesPerPartition: config.maxBytesPerPartition,
      heartbeatInterval: config.heartbeatInterval,
      fromBeginning: config.fromBeginning,
    };

    this.consumer = await this.kafkaClient.consumer(consumerConfig, topicsList);

    this.commitManager.start(this.consumer, config);
    this.ready = true;
    this.logger.info('Kafka consumer ready');

    const onMessageBatch = async ({
      batch,
      resolveOffset,
      commitOffsetsIfNecessary,
      heartbeat,
      isRunning,
    }: EachBatchPayload) => {
      this.commitManager.setPartitionCBs({
        partition: batch.partition,
        resolveOffset,
        commitOffsetsIfNecessary,
        heartbeat,
        isRunning,
      });

      for (const message of batch.messages) {
        const extendedMessage = {
          ...message,
          partition: batch.partition,
          topic: batch.topic,
          highWaterOffset: batch.highWatermark,
        } as IExtendedKafkaMessage;

        this.logger.info(
          `message received from kafka,partition: ${extendedMessage.partition}, offset: ${extendedMessage.offset}`
        );

        if (config.maxParallelHandles) {
          this.queue?.push(extendedMessage);
          if (
            this.queue &&
            this.queue?.length() > config.maxQueueSize &&
            !this.paused
          ) {
            try {
              this.consumer?.pause(
                this.topicsList.map(t => {
                  return {topic: t};
                })
              );
            } catch (e) {
              this.logger.error('Pause err', e);
            }
            this.paused = true;
          }
        } else this.handleCB(extendedMessage, config, this.onData);
      }
    };

    await this.consumer.run({
      eachBatch: onMessageBatch,
    });
  };

  private async handleCB(
    data: IExtendedKafkaMessage,
    config: IConsumerConfig,
    handler?: (data: IExtendedKafkaMessage) => Promise<void>
  ) {
    try {
      if (!handler) throw new Error('No handler provided');

      this.commitManager.notifyStartProcessing(data);
      const [, error] = await to(handler(data));
      if (!error) {
        return;
      }

      this.logger.error(`Error handling message: ${error}`);

      data.headers = data.headers || {};
      data.headers.originalTopic = data.topic;
      const [, e] = await to(
        this.kafkaClient.producer.send({
          acks: 1,
          topic: config.retryTopic,
          messages: [data],
        })
      );

      if (e) {
        this.logger.error(`Error producing to retry: ${e}`);
      }
    } finally {
      this.commitManager.notifyFinishedProcessing(data);
    }
  }

  private async defaultOnData(data: IExtendedKafkaMessage) {
    this.logger.info(`Handling received message with offset: ${data.offset}`);
    return Promise.resolve();
  }

  private async defaultOnError(error: unknown) {
    this.logger.error(error);

    return Promise.resolve();
  }

  // Sometimes resume fails due to rebalance. we need to retry until success
  private retryResume() {
    const MAX_RETRIES = 5;
    let tryNum = 0;
    const interval = setInterval(helper.bind(this, this), 500);
    helper.call(this, this);

    async function helper(obj: any = {}) {
      tryNum++;
      if (tryNum > MAX_RETRIES) {
        obj.logger.error('Unable to resume consumption');
        process.kill(process.pid);
      }

      if (obj.paused) {
        try {
          if (!obj.autoCommit)
            await obj.commitManager.commitProcessedOffsets(true);
          obj.consumer.resume(
            obj.topicsList.map((t: any) => {
              return {topic: t};
            })
          );
          obj.paused = false;
          obj.logger.info(
            `Resume successful for ${JSON.stringify(obj.topicsList)}`
          );
          clearInterval(interval);
        } catch (e) {
          obj.logger.error(`Resume err ${e}`);
        }
      } else {
        clearInterval(interval);
      }
    }
  }
}
