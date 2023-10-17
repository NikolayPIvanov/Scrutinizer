import {inject, injectable} from 'inversify';
import {IConfiguration} from '../configuration';
import {TYPES} from '../injection/types';
import {IProviderConfigurationMerger} from './provider.interfaces';
import {
  IChainIdNamePair,
  IChainRpcUrlPair,
  IExtendedChainRpcUrlPair,
  IExtendedRpcInstance,
  IScrapper,
  ITransformedExtendedRpcInstance,
} from './scrapers/scraper.interfaces';

@injectable()
export class ProviderConfigurationMerger
  implements IProviderConfigurationMerger
{
  constructor(
    @inject(TYPES.IChainIdScrapper)
    private chainIdScrapper: IScrapper<IChainIdNamePair>,
    @inject(TYPES.IChainRpcScrapper)
    private chainRpcScrapper: IScrapper<IChainRpcUrlPair>,
    @inject(TYPES.IConfiguration)
    private configuration: IConfiguration
  ) {}

  public mergeConfigurations =
    async (): Promise<ITransformedExtendedRpcInstance> => {
      const {chainIdsList, rpcUrlsList} = await this.fetchConfigurations();

      const extendedChainRpcUrlPair = this.prepareExtendedChainRpcUrlPair(
        rpcUrlsList,
        chainIdsList
      );

      return this.prepareTransformedExtendedChainRpcUrlPair(
        extendedChainRpcUrlPair
      );
    };

  private fetchConfigurations = async () => {
    const [chainIdsList, rpcUrlsList] = await Promise.all([
      this.chainIdScrapper.scrape(),
      this.chainRpcScrapper.scrape(),
    ]);
    if (!rpcUrlsList || !chainIdsList) {
      throw new Error('No RPC list variable!');
    }

    return {chainIdsList, rpcUrlsList};
  };

  private prepareExtendedChainRpcUrlPair = (
    rpcUrlsList: IChainRpcUrlPair,
    chainIdsList: IChainIdNamePair
  ) =>
    Object.keys(rpcUrlsList).reduce((acc, key) => {
      return {
        ...acc,
        [key]: {
          ...rpcUrlsList[key],
          chainId: +key,
          name: chainIdsList[key] || null,
        } as IExtendedRpcInstance,
      };
    }, {}) as IExtendedChainRpcUrlPair;

  private prepareTransformedExtendedChainRpcUrlPair = (
    extendedChainRpcUrlPair: IExtendedChainRpcUrlPair
  ): ITransformedExtendedRpcInstance => {
    const configurations = Object.values(extendedChainRpcUrlPair)
      .map(row => ({
        ...row,
        rpcs: row.rpcs
          .filter(row => !!row?.url)
          .map(row => row.url)
          .filter(row => !row.includes('infura.io'))
          .filter(row => !row.includes('bsc-dataseed'))
          .filter(row => !row.startsWith('wss'))
          .sort(() => (Math.random() > 0.5 ? -1 : 1)),
      }))
      .filter(
        (row: ITransformedExtendedRpcInstance) =>
          row.name &&
          row.rpcs.length >= 3 &&
          row.chainId === this.configuration.network.chainId
      );

    if (!configurations?.length) {
      throw new Error('No configurations!');
    }

    return configurations[0];
  };
}
