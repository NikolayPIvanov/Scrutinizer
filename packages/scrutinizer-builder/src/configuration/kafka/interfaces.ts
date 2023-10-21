export interface IKafkaConfiguration {
  clientId: string | undefined;
  brokers: string[];
  topics: ITopicsConfiguration;
  groups: IGroupConfiguration;
}
export interface ITopicConfiguration {
  name: string;
  maxBytesPerPartition?: number;
}

export interface ITopicsConfiguration {
  blocks: ITopicConfiguration;
  blocksRetry: ITopicConfiguration;
  blocksDlq: ITopicConfiguration;
  blocksFull: ITopicConfiguration;
}

export interface IGroupConfiguration {
  blocks: string;
  blocksRetry: string;
}

// Path: packages/scrutinizer-fetcher/src/configuration/network/validators.ts
