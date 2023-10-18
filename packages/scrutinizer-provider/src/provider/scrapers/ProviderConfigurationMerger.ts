import {injectable} from 'inversify';
import {
  IChainIdNamePair,
  IChainRpcUrlPair,
  IExtendedChainRpcUrlPair,
  IExtendedRpcInstance,
  IProviderConfigurationMerger,
  IScrapper,
  ITransformedExtendedRpcInstance,
} from './scraper.interfaces';

@injectable()
export class ProviderConfigurationMerger
  implements IProviderConfigurationMerger
{
  constructor(
    private chainIdScrapper: IScrapper<IChainIdNamePair>,
    private chainRpcScrapper: IScrapper<IChainRpcUrlPair>
  ) {}

  public mergeConfigurations = async (
    chainId: number
  ): Promise<ITransformedExtendedRpcInstance> => {
    const {chainIdsList, rpcUrlsList} = await this.fetchConfigurations();

    const extendedChainRpcUrlPair = this.prepareExtendedChainRpcUrlPair(
      rpcUrlsList,
      chainIdsList
    );

    return this.prepareTransformedExtendedChainRpcUrlPair(
      extendedChainRpcUrlPair,
      chainId
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
    extendedChainRpcUrlPair: IExtendedChainRpcUrlPair,
    chainId: number
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
          row.name && row.rpcs.length >= 3 && row.chainId === chainId
      );

    if (!configurations?.length) {
      throw new Error('No configurations!');
    }

    return configurations[0];
  };
}
