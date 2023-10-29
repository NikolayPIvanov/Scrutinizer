import {Container} from 'inversify';
import {
  Configuration,
  ConfigurationValidationSchema,
  IConfiguration,
  IConfigurationValidationSchema,
} from '../configuration';

import {infrastructure} from 'scrutinizer-infrastructure';
import {types} from '../@types';
import {DbQueries, IDbQueries} from '../ksql';
import {KafkaTopicMigrator} from '../migrations';
import {IProviderAdapter, ProviderAdapter} from '../provider';
import {
  ILagCalculatorService,
  IValidatorService,
  LagCalculatorService,
  ValidatorService,
} from '../services';

export class ContainerInstance extends Container {
  constructor() {
    super();

    this.registerServices();
  }

  private async registerServices() {
    this.bind<IConfigurationValidationSchema>(
      types.IConfigurationValidationSchema
    )
      .to(ConfigurationValidationSchema)
      .inSingletonScope();

    this.bind<IConfiguration>(types.IConfiguration)
      .to(Configuration)
      .inSingletonScope();

    this.bind<IDbQueries>(types.IDbQueries).to(DbQueries).inSingletonScope();

    this.bind<IValidatorService>(types.IValidator)
      .to(ValidatorService)
      .inSingletonScope();

    this.bind<ILagCalculatorService>(types.ILagCalculatorService)
      .to(LagCalculatorService)
      .inSingletonScope();

    this.bind<IProviderAdapter>(types.IProvider)
      .to(ProviderAdapter)
      .inSingletonScope();

    this.bind<KafkaTopicMigrator>(types.KafkaTopicMigrator)
      .to(KafkaTopicMigrator)
      .inSingletonScope();

    this.configureDynamicValueServiceRegistrations();
  }

  private configureDynamicValueServiceRegistrations() {
    const configuration = this.get<IConfiguration>(types.IConfiguration);

    this.bind<infrastructure.logging.ILogger>(types.ILogger)
      .toDynamicValue(
        () => new infrastructure.logging.Logger(configuration.logging)
      )
      .inSingletonScope();

    this.bind<infrastructure.messaging.IKafkaClient>(types.IKafkaClient)
      .toDynamicValue(
        () => new infrastructure.messaging.KafkaClient(configuration.kafka)
      )
      .inSingletonScope();

    this.bind<infrastructure.ksql.IKsqldb>(types.IKsqlDb)
      .toDynamicValue(() => new infrastructure.ksql.Ksqldb(configuration.ksql))
      .inSingletonScope();
  }
}
