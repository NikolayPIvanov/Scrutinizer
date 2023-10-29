/* eslint-disable node/no-extraneous-import */
import {inject, injectable} from 'inversify';
import {infrastructure} from 'scrutinizer-infrastructure';
import {IProvider, factory} from 'scrutinizer-provider';
import {types} from '../@types';
import {IConfiguration} from '../configuration';
import {IProviderAdapter} from './IProviderAdapter';

@injectable()
export class ProviderAdapter implements IProviderAdapter {
  private instance?: IProvider;

  constructor(
    @inject(types.ILogger) private logger: infrastructure.logging.ILogger,
    @inject(types.IConfiguration) private configuration: IConfiguration
  ) {}

  /**
   * @note Adapting this provider since inversify has some issues with the provider
   * @returns {Promise<IProvider>}
   */
  public async getInstance(): Promise<IProvider> {
    if (!this.instance) {
      this.instance = await factory.create({
        logger: this.logger,
        chainId: this.configuration.network.chainId,
        providerInitializerConfiguration: this.configuration.network,
      });
    }

    return this.instance;
  }
}
