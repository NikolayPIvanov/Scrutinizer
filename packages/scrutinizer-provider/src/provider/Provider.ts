import {IProviderInitializerConfiguration} from './factories/factories.interfaces';
import {IProvider, IProviderManagement} from './provider.interfaces';

export class Provider implements IProvider {
  constructor(private providerManagement: IProviderManagement) {}

  get api() {
    return this.providerManagement.api;
  }

  public async initialize(
    providerInitializerConfiguration: IProviderInitializerConfiguration
  ): Promise<void> {
    await this.providerManagement.initialize(providerInitializerConfiguration);
  }
}
