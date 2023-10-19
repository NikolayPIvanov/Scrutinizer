import {Container} from 'inversify';
import {
  Configuration,
  ConfigurationValidationSchema,
  IConfiguration,
  IConfigurationValidationSchema,
} from '../configuration';

import {TYPES} from './types';

import {infrastructure} from 'scrutinizer-infrastructure';
import {DbQueries, IDbQueries} from '../ksql';
import {IValidator, Validator} from '../validators';

export class ContainerInstance extends Container {
  constructor() {
    super();

    this.registerServices();
  }

  private async registerServices() {
    this.bind<IConfigurationValidationSchema>(
      TYPES.IConfigurationValidationSchema
    )
      .to(ConfigurationValidationSchema)
      .inSingletonScope();

    this.bind<IConfiguration>(TYPES.IConfiguration)
      .to(Configuration)
      .inSingletonScope();

    this.bind<IDbQueries>(TYPES.IDbQueries).to(DbQueries).inSingletonScope();
    this.bind<IValidator>(TYPES.IValidator).to(Validator).inSingletonScope();

    const configuration = this.get<IConfiguration>(TYPES.IConfiguration);

    this.bind<infrastructure.logging.ILogger>(TYPES.ILogger)
      .toDynamicValue(
        () => new infrastructure.logging.Logger(configuration.logging)
      )
      .inSingletonScope();

    this.bind<infrastructure.messaging.IKafkaClient>(TYPES.IKafkaClient)
      .toDynamicValue(
        () => new infrastructure.messaging.KafkaClient(configuration.kafka)
      )
      .inSingletonScope();

    this.bind<infrastructure.ksql.IKsqldb>(TYPES.IKsqlDb)
      .toDynamicValue(() => new infrastructure.ksql.Ksqldb(configuration.ksql))
      .inSingletonScope();
  }
}
