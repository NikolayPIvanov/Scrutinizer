import {
  IProviderInitializerConfiguration,
  IProviderManagementConfiguration,
} from './factories/factories.interfaces';
import {
  IBlockRetrieval,
  IProviderConfigurator,
  IProviderManagement,
} from './provider.interfaces';

export class ProviderManagement implements IProviderManagement {
  constructor(
    private providerConfigurator: IProviderConfigurator,
    private blockRetrieval: IBlockRetrieval
  ) {}

  get api(): IBlockRetrieval {
    return this.blockRetrieval;
  }

  public initialize = async ({
    providerRpcConfiguration,
    refreshProvidersInterval,
  }: IProviderInitializerConfiguration) => {
    await this.providerConfigurator.prepareProviders(providerRpcConfiguration);

    this.initializeTimers({
      refreshProvidersInterval,
    });
  };

  private async initializeTimers({
    refreshProvidersInterval,
  }: IProviderManagementConfiguration) {
    this.initializePeriodicProviderRefresh(refreshProvidersInterval);
  }

  private initializePeriodicProviderRefresh = (
    refreshProvidersInterval: number
  ) =>
    setInterval(
      () => this.providerConfigurator.refreshProviders(),
      refreshProvidersInterval
    );
}
