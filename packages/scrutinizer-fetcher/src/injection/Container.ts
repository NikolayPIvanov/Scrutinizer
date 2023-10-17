import {Container, interfaces} from 'inversify';
import {
  Configuration,
  ConfigurationValidationSchema,
  IConfiguration,
  IConfigurationValidationSchema,
} from '../configuration';

import {TYPES} from './types';

// eslint-disable-next-line node/no-extraneous-import
import {infrastructure} from 'scrutinizer-infrastructure';
import {DbQueries, IDbQueries} from '../ksql';
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
import {IValidator, Validator} from '../validators';

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

    this.bind<infrastructure.ksql.IKsqldb>(TYPES.IKsqlDb)
      .toDynamicValue((context: interfaces.Context) => {
        const configuration = context.container.get<IConfiguration>(
          TYPES.IConfiguration
        );

        return new infrastructure.ksql.Ksqldb(configuration.ksql);
      })
      .inSingletonScope();

    this.bind<IDbQueries>(TYPES.IDbQueries).to(DbQueries).inSingletonScope();
  }
}
