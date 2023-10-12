import {Offsets, RecordBatchEntry} from 'kafkajs';

export type IRecordBatchEntry = RecordBatchEntry;

export interface IConsumerInstance {
  initialize: (
    bootstrapConfiguration: IConsumerBootstrapConfiguration
  ) => Promise<void>;
}

export interface IExtendedKafkaMessage extends RecordBatchEntry {
  partition: number;
  topic: string;
  highWaterOffset: string;
}

export interface IConsumerBootstrapConfiguration {
  groupId: string;
  topics: string[];
  autoCommit: boolean;
  consumerConfiguration: IConsumerConfig;
  onMessageHandler: (message: IExtendedKafkaMessage) => Promise<void>;
  onErrorHandler: (error: unknown) => void;
}

export interface IConsumerConfig {
  maxParallelHandles: number | undefined;
  maxQueueSize: number;
  maxBytesPerPartition: number;
  heartbeatInterval: number;
  commitInterval: number;
  autoCommit: boolean;
  fromBeginning: boolean;
  retryTopic: string;
  retryThreshold: number;
  dlqTopic: string;
}

export interface ICommitManager {
  start: (consumerConfiguration: IConsumerConfig) => void;
  notifyStartProcessing: (message: IExtendedKafkaMessage) => void;
  notifyFinishedProcessing: (message: IExtendedKafkaMessage) => void;
  commitProcessedOffsets: () => Promise<void>;
  setPartitionCallbacks: (register: IPartitionCallbackRegister) => void;
  findMessage(partition: number, offset: string): IPartitionMessage | undefined;
}

export interface IPartitionMessage {
  offset: string;
  topic: string;
  done: boolean;
}

export interface IPartitionCallbackRegister {
  partition: number;
  resolveOffset(offset: string): void;
  heartbeat(): Promise<void>;
  commitOffsetsIfNecessary(offsets?: Offsets): Promise<void>;
  isRunning(): boolean;
}
