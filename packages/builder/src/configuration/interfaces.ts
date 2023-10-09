export interface IKafkaConfiguration {
  clientId: string | undefined;
  brokers: string[];
  topics: ITopicsConfiguration;
  groups: IGroupConfiguration;
}

export interface IGroupConfiguration {
  blocks: string;
  blocksRetry: string;
}

export interface ITopicConfiguration {
  name: string;
  maxBytesPerPartition?: number;
}

export interface ITopicsConfiguration {
  blocks: ITopicConfiguration;
  retryBlocks: ITopicConfiguration;
  fullBlock: ITopicConfiguration;
}

export interface ILoggingConfiguration {
  level: string;
}

export interface INetworkConfiguration {
  chainId: number;
  infuraUrl: string;
  checkBlockLagIntervalMultiplier: number;
  blockLagThreshold: number;
  blockTime: number;
  maxProviderCount: number;
  maxRequestTime: number;
  refreshProvidersInterval: number;
}

export interface IConfiguration {
  logging: ILoggingConfiguration;
  kafka: IKafkaConfiguration;
  network: INetworkConfiguration;
}

export interface IConfigurationValidationSchema {
  validate(configuration: IConfiguration): void;
}