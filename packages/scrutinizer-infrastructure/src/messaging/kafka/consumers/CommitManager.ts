import {
  ICommitManager,
  IConsumerConfig,
  IExtendedKafkaMessage,
  IPartitionCallbackRegister,
  IPartitionMessage,
} from './consumers.interface';

const COMMIT_TIME_INTERVAL = 5000;

export class CommitManager implements ICommitManager {
  private partitionsData: Record<string, IPartitionMessage[]> = {};
  private partitionCallbacks: Record<string, IPartitionCallbackRegister> = {};
  private commitInterval: number = COMMIT_TIME_INTERVAL;

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
    this.partitionsData[partition].push({
      offset: offset,
      topic: topic,
      done: false,
    });
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
    try {
      for (const key in this.partitionsData) {
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
          if (!this.partitionCallbacks[partition].isRunning()) break;

          this.partitionCallbacks[partition].resolveOffset(
            lastProcessedRecord.offset
          );

          await this.partitionCallbacks[partition].commitOffsetsIfNecessary();

          this.partitionsData[key].splice(
            0,
            this.partitionsData[key].indexOf(lastProcessedRecord) + 1
          ); // remove committed records from array
        }
      }

      Promise.resolve();
    } catch (e) {
      Promise.reject(e);
    }
  }

  private getLastProcessedAndFirstUnprocessedIndexes(key: string) {
    const pi = this.partitionsData[key].findIndex(
      (record: IPartitionMessage) => record.done
    ); // last processed index
    const npi = this.partitionsData[key].findIndex(
      (record: IPartitionMessage) => {
        return !record.done;
      }
    ); // first unprocessed index

    return {npi, pi};
  }
}
