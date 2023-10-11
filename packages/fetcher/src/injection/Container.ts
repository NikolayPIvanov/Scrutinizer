import {Container, interfaces} from 'inversify';
import {
  Configuration,
  ConfigurationValidationSchema,
  IConfiguration,
  IConfigurationValidationSchema,
} from '../configuration';

import {FullBlockConsumer} from '../messaging/FullBlockConsumer';
import {FullBlockRetryConsumer} from '../messaging/FullBlockRetryConsumer';
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
import {IValidator, Validator} from '../validators/Validator';
import {TYPES} from './types';

// eslint-disable-next-line node/no-extraneous-import
import {infrastructure} from 'scrutinizer-infrastructure';
import {DbQueries} from '../ksql/Queries';
import {IDbQueries} from '../ksql/ksql.interfaces';

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

    this.bind<IValidator>(TYPES.IValidator).to(Validator).inSingletonScope();

    this.bind<infrastructure.messaging.IKafkaClient>(TYPES.IKafkaClient)
      .toDynamicValue((context: interfaces.Context) => {
        const configuration = context.container.get<IConfiguration>(
          TYPES.IConfiguration
        );

        return new infrastructure.messaging.KafkaClient(configuration.kafka);
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
      .to(FullBlockConsumer)
      .inSingletonScope();

    this.bind<infrastructure.messaging.IConsumerInstance>(
      TYPES.IConsumerInstance
    )
      .to(FullBlockRetryConsumer)
      .inSingletonScope();

    this.bind<infrastructure.caching.redis.IRedisClient>(TYPES.IRedisClient)
      .toDynamicValue((context: interfaces.Context) => {
        const configuration = context.container.get<IConfiguration>(
          TYPES.IConfiguration
        );

        return new infrastructure.caching.redis.Redis(configuration.redis);
      })
      .inSingletonScope();

    this.bind<infrastructure.ksql.IKsqldb>(TYPES.IKsqlDb)
      .toDynamicValue((context: interfaces.Context) => {
        const configuration = context.container.get<IConfiguration>(
          TYPES.IConfiguration
        );

        return new infrastructure.ksql.Ksqldb(configuration.ksql);
      })
      .inSingletonScope();

    this.bind<IDbQueries>(TYPES.IDbQueries).to(DbQueries).inSingletonScope();

    this.getAll(TYPES.IConsumerInstance);
  }
}
