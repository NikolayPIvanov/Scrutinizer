export interface INetworkConfiguration {
  chainId: number;
  checkBlockLagIntervalMultiplier: number;
  blockLagThreshold: number;
  blockTime: number;
  maxProviderCount: number;
  maxRequestTime: number;
  refreshProvidersInterval: number;
}

// Path: packages/scrutinizer-fetcher/src/configuration/network/interfaces.ts
