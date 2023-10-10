import {RpcNodes} from './NodeStorageRepository';
import {ITransformedExtendedRpcInstance} from './scrapers/scraper.interfaces';

export interface IProviderConfigurationMerger {
  mergeConfigurations(): Promise<ITransformedExtendedRpcInstance>;
}

export interface INodeStorageRepository {
  init(): Promise<void>;
  findStartNodes(chainId: number): Promise<RpcNodes[]>;
  findAll(): Promise<RpcNodes[]>;
  upsert(node: RpcNodes, update?: number): void;
}

export interface IEvmApi {
  errorCount: number;
  latency: number;
  totalRequests: number;
  rateLimited: number;
  endpointUrl: string;
  proxyRequest(body: unknown): Promise<any>;
  getFullBlock(blockNumber: number): Promise<any>;
  getChainId(): Promise<number>;
  getBlockNumber(): Promise<number>;
  getBalance(address: string): Promise<string>;
  getBlock(blockNumber?: number): Promise<any>;
  getLogs(fromBlock?: number, toBlock?: number): Promise<any>;
}

export interface IProvider {
  initialize: (
    providerRpcConfiguration: ITransformedExtendedRpcInstance,
    lastCommitted?: number
  ) => Promise<void>;
  getFullBlock(blockNumber: number, forcedProvider?: IEvmApi): Promise<any>;
}
