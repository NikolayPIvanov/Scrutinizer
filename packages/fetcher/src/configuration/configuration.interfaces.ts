export interface IKafkaConfiguration {
  clientId: string | undefined;
  brokers: string[];
  topics: ITopicsConfiguration;
  groups: IGroupConfiguration;
}

export interface IGroupConfiguration {
  fullBlock: string;
  retryFullBlock: string;
}

export interface ITopicsConfiguration {
  blocks: string;
  forks: string;
  confirmed: string;
  fullBlock: string;
  fullBlockRetry: string;
  fullBlockDlq: string;
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

export interface IRedisConfiguration {
  url: string;
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
  redis: IRedisConfiguration;
  logging: ILoggingConfiguration;
  kafka: IKafkaConfiguration;
  network: INetworkConfiguration;
  ksql: IKsqlConfiguration;
  validator: IValidatorConfiguration;
}

export interface IConfigurationValidationSchema {
  validate(configuration: IConfiguration): void;
}
