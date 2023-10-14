import {injectable} from 'inversify';
import {
  ICommitManager,
  IConsumerConfig,
  IExtendedKafkaMessage,
  IPartitionCallbackRegister,
  IPartitionMessage,
} from './consumers.interface';
import EventEmitter = require('events');

const COMMIT_TIME_INTERVAL = 5000;
const RECORD_REMOVED = 'recordRemoved';

@injectable()
export class CommitManager implements ICommitManager {
  private partitionsData: Record<string, IPartitionMessage[]> = {};
  private partitionCallbacks: Record<string, IPartitionCallbackRegister> = {};
  private commitInterval: number = COMMIT_TIME_INTERVAL;
  private emitter = new EventEmitter();

  public onRecordRemoved(
    callback: (message: IExtendedKafkaMessage) => Promise<void>
  ) {
    this.emitter.on(RECORD_REMOVED, callback);
  }

  public start(consumerConfiguration: IConsumerConfig) {
    this.commitInterval =
      consumerConfiguration.commitInterval || COMMIT_TIME_INTERVAL;

    if (!consumerConfiguration.autoCommit) {
      setInterval(() => {
        this.commitProcessedOffsets();
      }, this.commitInterval);
    }
  }

  public setPartitionCallbacks(register: IPartitionCallbackRegister) {
    this.partitionCallbacks[register.partition] = register;
  }

  public notifyStartProcessing(message: IExtendedKafkaMessage) {
    const partition = message.partition;
    const offset = message.offset;
    const topic = message.topic;

    this.partitionsData[partition] = this.partitionsData[partition] || [];
    const record = this.partitionsData[partition].find(
      (record: IPartitionMessage) => record.offset === offset
    );
    if (record) {
      return true;
    }

    this.partitionsData[partition].push({
      offset: offset,
      topic: topic,
      done: false,
    });

    return false;
  }

  public notifyFinishedProcessing(message: IExtendedKafkaMessage) {
    const partition = message.partition;
    const offset = message.offset;

    this.partitionsData[partition] = this.partitionsData[partition] || [];
    const record = this.partitionsData[partition].find(
      (record: IPartitionMessage) => record.offset === offset
    );

    if (!record) {
      throw new Error(
        `No record found for offset ${offset} in partition ${partition}`
      );
    }

    record.done = true;
  }

  public async commitProcessedOffsets() {
    await Promise.all(
      Object.keys(this.partitionsData).map(async key => {
        const partition = +key;

        await this.partitionCallbacks[partition].heartbeat();

        const {npi, pi} = this.getLastProcessedAndFirstUnprocessedIndexes(key);

        const lastProcessedRecord =
          npi > 0
            ? this.partitionsData[key][npi - 1]
            : pi > -1
            ? this.partitionsData[key][this.partitionsData[key].length - 1]
            : null;

        if (lastProcessedRecord) {
          if (!this.isRunning(partition)) return;

          this.partitionCallbacks[partition].resolveOffset(
            lastProcessedRecord.offset
          );

          await this.partitionCallbacks[partition].commitOffsetsIfNecessary();

          const removed = this.partitionsData[key].splice(
            0,
            this.partitionsData[key].indexOf(lastProcessedRecord) + 1
          ); // remove committed records from array

          removed.forEach(record => this.emitter.emit(RECORD_REMOVED, record));
        }
      })
    );
  }

  private isRunning = (partition: number): boolean => {
    try {
      return this.partitionCallbacks[partition].isRunning();
    } catch (e) {
      return false;
    }
  };

  private getLastProcessedAndFirstUnprocessedIndexes(key: string) {
    const pi = this.partitionsData[key].findIndex(
      (record: IPartitionMessage) => record.done
    ); // last processed index
    const npi = this.partitionsData[key].findIndex(
      (record: IPartitionMessage) => !record.done
    ); // first unprocessed index

    return {npi, pi};
  }
}
