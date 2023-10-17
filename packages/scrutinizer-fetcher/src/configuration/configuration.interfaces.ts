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

export interface ILoggingConfiguration {
  level: string;
}

export interface INetworkConfiguration {
  chainId: number;
  checkBlockLagIntervalMultiplier: number;
  blockLagThreshold: number;
  blockTime: number;
  maxProviderCount: number;
  maxRequestTime: number;
  refreshProvidersInterval: number;
}

export interface IKsqlConfiguration {
  host: string;
  port: number;
}

export interface IValidatorConfiguration {
  blocksThreshold: number;
  validatorInterval: number;
}

export interface IConfiguration {
  logging: ILoggingConfiguration;
  kafka: IKafkaConfiguration;
  network: INetworkConfiguration;
  ksql: IKsqlConfiguration;
  validator: IValidatorConfiguration;
}

export interface IConfigurationValidationSchema {
  validate(configuration: IConfiguration): void;
}
