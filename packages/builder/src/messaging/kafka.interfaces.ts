import {Consumer, ConsumerConfig, Producer, RecordBatchEntry} from 'kafkajs';

export interface IKafkaClient {
  producer: Producer;
  consumer: (config: ConsumerConfig, topics: string[]) => Promise<Consumer>;
  bootstrap: () => Promise<void>;
}

export interface IConsumer {
  initialize: (data: any) => Promise<void>;
}

export interface ICommitManager {
  start: (kafkaConsumer: Consumer, config: any) => void;
  notifyStartProcessing: (data: IExtendedKafkaMessage) => void;
  notifyFinishedProcessing: (data: IExtendedKafkaMessage) => void;
  commitProcessedOffsets: () => Promise<void>;
  setPartitionCBs: (obj: any) => void;
  getLastCommitted: () => void;
}

export interface IConsumerConfig {
  maxParallelHandles: number | undefined;
  maxQueueSize: number;
  maxBytesPerPartition: number;
  heartbeatInterval: number;
  fromBeginning: boolean;
  retryTopic: string;
}

export interface IExtendedKafkaMessage extends RecordBatchEntry {
  partition: number;
  topic: string;
  highWaterOffset: string;
}
