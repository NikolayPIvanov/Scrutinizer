export interface IKafkaConfiguration {
  clientId: string | undefined;
  brokers: string[];
  topics: ITopicsConfiguration;
}

export interface IGroupConfiguration {
  blocks: string;
}
export interface ITopicsConfiguration {
  blocks: string;
}

export interface ILoggingConfiguration {
  level: string;
}

export interface INetworkConfiguration {
  chainId: number;
}

export interface IConfiguration {
  logging: ILoggingConfiguration;
  kafka: IKafkaConfiguration;
  network: INetworkConfiguration;
}

export interface IConfigurationValidationSchema {
  validate(configuration: IConfiguration): void;
}
