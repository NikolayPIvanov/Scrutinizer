import {ILoggerLike} from '../../common';
import {BlockRetrieval} from '../BlockRetrieval';
import {Provider} from '../Provider';
import {ProviderConfigurator} from '../ProviderConfigurator';
import {ProviderManagement} from '../ProviderManagement';
import {MemoryNodeStorageRepository} from '../repositories';
import {
  DefaultChainIdScrapper,
  DefaultChainRpcScrapper,
  ProviderConfigurationMerger,
} from '../scrapers';
import {DefaultEvmApiFactory} from './DefaultEvmApiFactory';

export class DefaultProviderFactory {
  public create = async (logger: ILoggerLike, chainId: number) => {
    const defaultChainIdScrapper = new DefaultChainIdScrapper(logger);
    const defaultChainRpcScrapper = new DefaultChainRpcScrapper(logger);
    const providerConfigurationMerger = new ProviderConfigurationMerger(
      defaultChainIdScrapper,
      defaultChainRpcScrapper
    );

    const nodeStorageRepository = new MemoryNodeStorageRepository();
    const evmApiFactory = new DefaultEvmApiFactory();

    const providerConfigurator = new ProviderConfigurator(
      nodeStorageRepository,
      evmApiFactory
    );

    const blockRetrieval = new BlockRetrieval(logger, providerConfigurator);
    const providerManagement = new ProviderManagement(
      logger,
      providerConfigurator,
      blockRetrieval
    );

    const provider = new Provider(providerManagement);

    const providerConfiguration =
      await providerConfigurationMerger.mergeConfigurations(chainId);

    await provider.initialize(providerConfiguration, 0);

    return provider;
  };
}
