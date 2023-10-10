import {inject, injectable} from 'inversify';
import {Consumer} from 'kafkajs';
import {ILogger} from '../logger';
import {TYPES} from '../types';
import {ICommitManager} from './kafka.interfaces';

const COMMIT_TIME_INTERVAL = 5000;

@injectable()
export class CommitManager implements ICommitManager {
  private partitionsData: any = {};
  private partitionCallbacks: any = {};
  private lastCommitted: any[] = [];

  private kafkaConsumer?: Consumer;
  private commitInterval?: number;

  constructor(@inject(TYPES.ILogger) private logger: ILogger) {}

  public start(kafkaConsumer: Consumer, config: any) {
    this.kafkaConsumer = kafkaConsumer;
    this.commitInterval = config.commitInterval || COMMIT_TIME_INTERVAL;

    if (!config.autoCommit) {
      setInterval(() => {
        this.commitProcessedOffsets();
      }, COMMIT_TIME_INTERVAL);
    }
  }

  public notifyStartProcessing(data: any) {
    const partition = data.partition;
    const offset = data.offset;
    const topic = data.topic;

    this.partitionsData[partition] = this.partitionsData[partition] || [];
    this.partitionsData[partition].push({
      offset: offset,
      topic: topic,
      done: false,
    });
  }

  public notifyFinishedProcessing(data: any) {
    const partition = data.partition;
    const offset = data.offset;
    this.partitionsData[partition] = this.partitionsData[partition] || [];
    const record = this.partitionsData[partition].filter((record: any) => {
      return record.offset === offset;
    })[0];
    if (record) {
      record.done = true;
    }
  }

  public async commitProcessedOffsets() {
    try {
      const offsetsToCommit = [];
      for (const key in this.partitionsData) {
        const partition = +key;
        await this.partitionCallbacks[partition].heartbeat();
        const pi = this.partitionsData[key].findIndex((record: any) => {
          return record.done;
        }); // last processed index
        const npi = this.partitionsData[key].findIndex((record: any) => {
          return !record.done;
        }); // first unprocessed index
        const lastProcessedRecord =
          npi > 0
            ? this.partitionsData[key][npi - 1]
            : pi > -1
            ? this.partitionsData[key][this.partitionsData[key].length - 1]
            : null;
        if (lastProcessedRecord) {
          if (!this.partitionCallbacks[partition].isRunning()) break;
          await this.partitionCallbacks[partition].resolveOffset(
            lastProcessedRecord.offset
          );
          await this.partitionCallbacks[partition].commitOffsetsIfNecessary();
          this.partitionsData[key].splice(
            0,
            this.partitionsData[key].indexOf(lastProcessedRecord) + 1
          ); // remove commited records from array
          offsetsToCommit.push({
            partition: +key,
            offset: lastProcessedRecord.offset,
            topic: lastProcessedRecord.topic,
          });
        }
      }

      this.lastCommitted =
        offsetsToCommit.length > 0 ? offsetsToCommit : this.lastCommitted;
      Promise.resolve();
    } catch (e) {
      Promise.reject(e);
    }
  }

  public setPartitionCBs({
    partition,
    resolveOffset,
    commitOffsetsIfNecessary,
    heartbeat,
    isRunning,
  }: any) {
    this.partitionCallbacks[partition] = {
      resolveOffset,
      commitOffsetsIfNecessary,
      heartbeat,
      isRunning,
    };
  }

  public getLastCommitted() {
    return this.lastCommitted;
  }
}
