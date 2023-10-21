import {IKafkaConfiguration} from './kafka';
import {ILoggingConfiguration} from './logging';
import {INetworkConfiguration} from './network';

export {IKafkaConfiguration, ILoggingConfiguration, INetworkConfiguration};

export interface IConfiguration {
  logging: ILoggingConfiguration;
  kafka: IKafkaConfiguration;
  network: INetworkConfiguration;
}

export interface IConfigurationValidationSchema {
  validate(configuration: IConfiguration): void;
}
