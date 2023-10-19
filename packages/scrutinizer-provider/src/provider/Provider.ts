import {injectable} from 'inversify';
import {IProvider, IProviderManagement} from './provider.interfaces';
import {ITransformedExtendedRpcInstance} from './scrapers';

@injectable()
export class Provider implements IProvider {
  constructor(private providerManagement: IProviderManagement) {}

  get manager() {
    return this.providerManagement;
  }

  public async initialize(
    providerRpcConfiguration: ITransformedExtendedRpcInstance,
    lastCommitted?: number
  ): Promise<void> {
    await this.providerManagement.initialize(
      providerRpcConfiguration,
      1000,
      lastCommitted,
      60000,
      30,
      30
    );
  }
}
