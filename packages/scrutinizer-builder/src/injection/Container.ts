import {Container} from 'inversify';
import {
  Configuration,
  ConfigurationValidationSchema,
  IConfiguration,
  IConfigurationValidationSchema,
} from '../configuration';

import {infrastructure} from 'scrutinizer-infrastructure';
import {types} from '../@types';
import {NextBlockConsumer, RetryBlockConsumer} from '../messaging';
import {IProviderAdapter, ProviderAdapter} from '../provider';

export class ContainerInstance extends Container {
  constructor() {
    super();

    this.registerInstances();
  }

  private registerInstances(): void {
    this.bind<IConfigurationValidationSchema>(
      types.IConfigurationValidationSchema
    )
      .to(ConfigurationValidationSchema)
      .inSingletonScope();

    this.bind<IConfiguration>(types.IConfiguration)
      .to(Configuration)
      .inSingletonScope();

    this.bind<infrastructure.messaging.IConsumerInstance>(
      types.IConsumerInstance
    )
      .to(NextBlockConsumer)
      .inSingletonScope();

    this.bind<infrastructure.messaging.IConsumerInstance>(
      types.IConsumerInstance
    )
      .to(RetryBlockConsumer)
      .inSingletonScope();

    this.bind<IProviderAdapter>(types.IProvider)
      .to(ProviderAdapter)
      .inSingletonScope();

    this.configureDynamicValueServiceRegistrations();

    this.getAll(types.IConsumerInstance);
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

    this.bind<infrastructure.messaging.ICommitManager>(types.ICommitManager)
      .toDynamicValue(() => new infrastructure.messaging.CommitManager())
      .inSingletonScope();
  }
}
