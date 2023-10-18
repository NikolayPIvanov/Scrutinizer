export interface IChainIdNamePair {
  [key: string]: string;
}

export interface IProviderConfigurationMerger {
  mergeConfigurations(
    chainId: number
  ): Promise<ITransformedExtendedRpcInstance>;
}

export interface IScrapper<T> {
  scrape: () => Promise<T | null>;
}

export interface IRpcDetails {
  url: string;
  tracking: string;
  trackingDetails: string;
}

export interface IRpcInstance {
  rpcs: IRpcDetails[];
}

export interface IExtendedRpcInstance {
  rpcs: IRpcDetails[];
  chainId: number;
  name: string | null;
}

export interface ITransformedExtendedRpcInstance {
  rpcs: string[];
  chainId: number;
  name: string | null;
}

export interface IExtendedChainRpcUrlPair {
  [key: string]: IExtendedRpcInstance;
}

export interface IChainRpcUrlPair {
  [key: string]: IRpcInstance;
}
