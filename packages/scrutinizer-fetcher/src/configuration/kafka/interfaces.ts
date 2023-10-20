export interface IKafkaConfiguration {
  clientId: string | undefined;
  brokers: string[];
  topics: ITopicsConfiguration;
}
export interface ITopicConfiguration {
  name: string;
  maxBytesPerPartition?: number;
}

export interface ITopicsConfiguration {
  blockNumbers: ITopicConfiguration;
  forked: ITopicConfiguration;
  confirmed: ITopicConfiguration;
}

// Path: packages/scrutinizer-fetcher/src/configuration/network/validators.ts
