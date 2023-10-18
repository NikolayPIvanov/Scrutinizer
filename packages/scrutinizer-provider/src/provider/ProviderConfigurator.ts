import {to} from '../common';
import {
  IEvmApi,
  IEvmApiFactory,
  INodeStorageRepository,
  IProviderConfigurator,
} from './provider.interfaces';
import {ITransformedExtendedRpcInstance} from './scrapers';

export class ProviderConfigurator implements IProviderConfigurator {
  public providers: IEvmApi[] = [];
  public availableProviders: IEvmApi[] = [];

  constructor(
    private nodeStorageRepository: INodeStorageRepository,
    private evmApiFactory: IEvmApiFactory
  ) {}

  public async prepareProviders(
    configuration: ITransformedExtendedRpcInstance,
    maxProviderCount = 10
  ) {
    this.availableProviders = await this.createApiInstances(configuration);

    const responsive = await Promise.all(
      this.availableProviders?.map(async provider =>
        this.checkProviderResponsiveness(configuration, provider)
      )
    );

    this.providers = responsive
      .filter(provider => provider !== null)
      .slice(-maxProviderCount) as IEvmApi[];
  }

  public async refreshProviders(latencyBelow = 500) {
    const candidatesToReplace = this.providers.filter(
      e => e.errorCount > 0 || e.latency > latencyBelow
    );

    if (candidatesToReplace.length === 0) {
      return;
    }

    this.validateAndReplaceProvider();
  }

  private checkProviderResponsiveness = async (
    configuration: ITransformedExtendedRpcInstance,
    provider: IEvmApi
  ) => {
    const [chainId] = await to(provider.getChainId());
    if (chainId === configuration.chainId) {
      return provider;
    }

    return null;
  };

  private createApiInstances = async (
    configuration: ITransformedExtendedRpcInstance
  ): Promise<IEvmApi[]> => {
    return Promise.all(
      configuration.rpcs.map(rpc =>
        this.evmApiFactory.create(this.nodeStorageRepository, {
          endpoint: rpc,
          chainId: configuration.chainId,
          chainName: configuration.name!,
        })
      )
    );
  };

  private replaceProvider(nextProvider: IEvmApi) {
    this.providers.sort((a, b) => a.errorCount - b.errorCount);
    this.providers.pop();
    this.providers.push(nextProvider);
  }

  private async validateAndReplaceProvider() {
    const providers = this.availableProviders.filter(
      e =>
        !this.providers.find(
          provider =>
            provider.rpcInstanceMetadata?.endpoint ===
            e.rpcInstanceMetadata?.endpoint
        )
    );

    if (!providers.length) {
      return;
    }

    const provider = providers[0];
    let [, error] = await to(provider.getBlock());
    if (error) {
      return;
    }

    [error] = await to(provider.getChainId());
    if (error) {
      return;
    }

    this.replaceProvider(provider);
  }
}
