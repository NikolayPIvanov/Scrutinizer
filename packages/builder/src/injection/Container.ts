import {Container, interfaces} from 'inversify';
import {
  Configuration,
  ConfigurationValidationSchema,
  IConfiguration,
  IConfigurationValidationSchema,
} from '../configuration';

import {NodeStorageRepository} from '../provider/NodeStorageRepository';
import {Provider} from '../provider/Provider';
import {ProviderConfigurationMerger} from '../provider/ProviderConfigurationMerger';
import {
  INodeStorageRepository,
  IProvider,
  IProviderConfigurationMerger,
} from '../provider/provider.interfaces';
import {ChainIdScrapper} from '../provider/scrapers/ChainIdScrapper';
import {ChainRpcScrapper} from '../provider/scrapers/ChainRpcScrapper';
import {
  IChainIdNamePair,
  IChainRpcUrlPair,
  IScrapper,
} from '../provider/scrapers/scraper.interfaces';
import {TYPES} from './types';

// eslint-disable-next-line node/no-extraneous-import
import {infrastructure} from 'scrutinizer-infrastructure';
import {NextBlockConsumer} from '../messaging/NextBlockConsumer';
import {RetryBlockConsumer} from '../messaging/RetryBlockConsumer';

export class ContainerInstance extends Container {
  constructor() {
    super();

    this.registerInstances();
  }

  private registerInstances(): void {
    this.bind<IConfigurationValidationSchema>(
      TYPES.IConfigurationValidationSchema
    )
      .to(ConfigurationValidationSchema)
      .inSingletonScope();

    this.bind<IConfiguration>(TYPES.IConfiguration)
      .to(Configuration)
      .inSingletonScope();

    this.bind<IScrapper<IChainIdNamePair>>(TYPES.IChainIdScrapper)
      .to(ChainIdScrapper)
      .inSingletonScope();

    this.bind<IScrapper<IChainRpcUrlPair>>(TYPES.IChainRpcScrapper)
      .to(ChainRpcScrapper)
      .inSingletonScope();

    this.bind<IProviderConfigurationMerger>(TYPES.IProviderConfigurationMerger)
      .to(ProviderConfigurationMerger)
      .inSingletonScope();

    this.bind<INodeStorageRepository>(TYPES.INodeStorageRepository)
      .to(NodeStorageRepository)
      .inSingletonScope();

    this.bind<IProvider>(TYPES.IProvider).to(Provider).inSingletonScope();

    this.bind<infrastructure.messaging.IKafkaClient>(TYPES.IKafkaClient)
      .toDynamicValue((context: interfaces.Context) => {
        const configuration = context.container.get<IConfiguration>(
          TYPES.IConfiguration
        );

        return new infrastructure.messaging.KafkaClient({
          ...configuration.kafka,
          logLevel: 1, // error
        });
      })
      .inSingletonScope();

    this.bind<infrastructure.logging.ILogger>(TYPES.ILogger)
      .toDynamicValue((context: interfaces.Context) => {
        const configuration = context.container.get<IConfiguration>(
          TYPES.IConfiguration
        );

        return new infrastructure.logging.Logger(configuration.logging);
      })
      .inSingletonScope();

    this.bind<infrastructure.messaging.ICommitManager>(TYPES.ICommitManager)
      .toDynamicValue(() => new infrastructure.messaging.CommitManager())
      .inSingletonScope();

    this.bind<infrastructure.messaging.IConsumerInstance>(
      TYPES.IConsumerInstance
    )
      .to(NextBlockConsumer)
      .inSingletonScope();

    this.bind<infrastructure.messaging.IConsumerInstance>(
      TYPES.IConsumerInstance
    )
      .to(RetryBlockConsumer)
      .inSingletonScope();

    this.getAll(TYPES.IConsumerInstance);
  }
}
