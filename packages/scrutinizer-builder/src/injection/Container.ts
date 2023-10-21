import {Container, interfaces} from 'inversify';
import {
  Configuration,
  ConfigurationValidationSchema,
  IConfiguration,
  IConfigurationValidationSchema,
} from '../configuration';

import {
  ChainIdScrapper,
  ChainRpcScrapper,
  IChainIdNamePair,
  IChainRpcUrlPair,
  INodeStorageRepository,
  IProvider,
  IProviderConfigurationMerger,
  IScrapper,
  NodeStorageRepository,
  Provider,
  ProviderConfigurationMerger,
} from '../provider';

// eslint-disable-next-line node/no-extraneous-import
import {infrastructure} from 'scrutinizer-infrastructure';
import {NextBlockConsumer, RetryBlockConsumer} from '../messaging';
import {types} from './types';

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

    this.bind<IScrapper<IChainIdNamePair>>(types.IChainIdScrapper)
      .to(ChainIdScrapper)
      .inSingletonScope();

    this.bind<IScrapper<IChainRpcUrlPair>>(types.IChainRpcScrapper)
      .to(ChainRpcScrapper)
      .inSingletonScope();

    this.bind<IProviderConfigurationMerger>(types.IProviderConfigurationMerger)
      .to(ProviderConfigurationMerger)
      .inSingletonScope();

    this.bind<INodeStorageRepository>(types.INodeStorageRepository)
      .to(NodeStorageRepository)
      .inSingletonScope();

    this.bind<IProvider>(types.IProvider).to(Provider).inSingletonScope();

    this.bind<infrastructure.messaging.IKafkaClient>(types.IKafkaClient)
      .toDynamicValue((context: interfaces.Context) => {
        const configuration = context.container.get<IConfiguration>(
          types.IConfiguration
        );

        return new infrastructure.messaging.KafkaClient({
          ...configuration.kafka,
          logLevel: 1, // error
        });
      })
      .inSingletonScope();

    this.bind<infrastructure.logging.ILogger>(types.ILogger)
      .toDynamicValue((context: interfaces.Context) => {
        const configuration = context.container.get<IConfiguration>(
          types.IConfiguration
        );

        return new infrastructure.logging.Logger(configuration.logging);
      })
      .inSingletonScope();

    this.bind<infrastructure.messaging.ICommitManager>(types.ICommitManager)
      .toDynamicValue(() => new infrastructure.messaging.CommitManager())
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

    this.getAll(types.IConsumerInstance);
  }
}
