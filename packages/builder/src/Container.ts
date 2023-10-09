import {Container} from 'inversify';
import {
  Configuration,
  ConfigurationValidationSchema,
  IConfiguration,
  IConfigurationValidationSchema,
} from './configuration';

import {ILogger, Logger} from './logger';
import {IKafkaClient, KafkaClient} from './messaging';
import {BaseConsumer} from './messaging/BaseConsumer';
import {CommitManager} from './messaging/CommitManager';
import {NextBlockConsumer} from './messaging/NextBlockConsumer';
import {RetryBlockConsumer} from './messaging/RetryBlockConsumer';
import {
  ICommitManager,
  IConsumer,
  IConsumerInstance,
} from './messaging/kafka.interfaces';
import {NodeStorageRepository} from './provider/NodeStorageRepository';
import {Provider} from './provider/Provider';
import {ProviderConfigurationMerger} from './provider/ProviderConfigurationMerger';
import {
  INodeStorageRepository,
  IProvider,
  IProviderConfigurationMerger,
} from './provider/provider.interfaces';
import {ChainIdScrapper} from './provider/scrapers/ChainIdScrapper';
import {ChainRpcScrapper} from './provider/scrapers/ChainRpcScrapper';
import {
  IChainIdNamePair,
  IChainRpcUrlPair,
  IScrapper,
} from './provider/scrapers/scraper.interfaces';
import {TYPES} from './types';

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

    this.bind<IKafkaClient>(TYPES.IKafkaClient)
      .to(KafkaClient)
      .inSingletonScope();

    this.bind<IConsumer>(TYPES.IConsumer).to(BaseConsumer).inTransientScope();

    this.bind<ICommitManager>(TYPES.ICommitManager)
      .to(CommitManager)
      .inSingletonScope();

    this.bind<IConsumerInstance>(TYPES.IConsumerInstance)
      .to(RetryBlockConsumer)
      .inSingletonScope();

    this.bind<IConsumerInstance>(TYPES.IConsumerInstance)
      .to(NextBlockConsumer)
      .inSingletonScope();

    this.bind<ILogger>(TYPES.ILogger).to(Logger).inSingletonScope();

    this.getAll(TYPES.IConsumerInstance);
  }
}
