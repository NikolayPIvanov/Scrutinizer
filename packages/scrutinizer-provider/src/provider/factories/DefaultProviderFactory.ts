import {BlockRetrieval} from '../BlockRetrieval';
import {Provider} from '../Provider';
import {ProviderConfigurator} from '../ProviderConfigurator';
import {ProviderManagement} from '../ProviderManagement';
import {IProvider} from '../provider.interfaces';
import {MemoryNodeStorageRepository} from '../repositories';
import {
  DefaultChainIdScrapper,
  DefaultChainRpcScrapper,
  ProviderConfigurationMerger,
} from '../scrapers';
import {DefaultEvmApiFactory} from './DefaultEvmApiFactory';
import {IProviderBootstrap, IProviderFactory} from './factories.interfaces';

export class DefaultProviderFactory implements IProviderFactory {
  public async create({
    logger,
    chainId,
    providerInitializerConfiguration,
  }: IProviderBootstrap) {
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

    const providerRpcConfiguration =
      await providerConfigurationMerger.mergeConfigurations(chainId);

    await provider.initialize({
      ...providerInitializerConfiguration,
      providerRpcConfiguration,
    });

    return provider as IProvider;
  }
}
