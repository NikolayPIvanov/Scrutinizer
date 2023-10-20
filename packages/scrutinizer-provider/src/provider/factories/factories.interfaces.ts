import {ILoggerLike} from '../../common';
import {
  IEvmApi,
  INodeStorageRepository,
  IProvider,
  IRpcInstanceMetadata,
} from '../provider.interfaces';
import {ITransformedExtendedRpcInstance} from '../scrapers';

export interface IEvmApiFactory {
  create: (
    repository: INodeStorageRepository,
    configuration: IRpcInstanceMetadata
  ) => Promise<IEvmApi>;
}

export interface IProviderFactory {
  create: (config: IProviderBootstrap) => Promise<IProvider>;
}

export interface IProviderBootstrap {
  logger: ILoggerLike;
  chainId: number;
  providerInitializerConfiguration: IProviderManagementConfiguration;
}

export interface IProviderManagementConfiguration {
  refreshProvidersInterval: number;
}

export interface IProviderInitializerConfiguration
  extends IProviderManagementConfiguration {
  providerRpcConfiguration: ITransformedExtendedRpcInstance;
}
