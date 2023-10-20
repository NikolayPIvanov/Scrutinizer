import {IKafkaConfiguration} from './kafka';
import {IKsqlConfiguration} from './ksql';
import {ILoggingConfiguration} from './logging';
import {INetworkConfiguration} from './network';
import {IValidatorConfiguration} from './validator';

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
