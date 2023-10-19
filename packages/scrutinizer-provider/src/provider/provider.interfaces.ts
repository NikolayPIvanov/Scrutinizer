import {ITransformedExtendedRpcInstance} from './scrapers/scraper.interfaces';

export interface IBlockRetrieval {
  getBlockNumber(maxRequestTime?: number): Promise<number | null>;
  getBlock(
    blockNumber: number,
    maxRequestTime: number,
    forceFastestProvider: boolean
  ): Promise<IFullJsonRpcBlock | null>;
}

export interface IEvmApiFactory {
  create(
    repository: INodeStorageRepository,
    configuration: IRpcInstanceMetadata
  ): Promise<IEvmApi>;
}

export interface IEvmApiFactory {
  create(
    repository: INodeStorageRepository,
    configuration: IRpcInstanceMetadata
  ): Promise<IEvmApi>;
}

export interface IProviderChainLagAndBlock {
  blockLag: number;
  lastCommitted: number;
}

export interface IBlockLagCalculation {
  lag: number;
  latest: number;
  previousLatest: number;
}

export interface IProviderManagement {
  initialize(
    providerRpcConfiguration: ITransformedExtendedRpcInstance,
    blockTime: number,
    lastCommitted?: number,
    refreshProvidersInterval?: number,
    blockLagThreshold?: number,
    checkBlockLagIntervalMultiplier?: number
  ): Promise<void>;
  onBlockLagCalculated(
    action: (calculation: IBlockLagCalculation) => Promise<void>
  ): void;
}

export interface IProviderConfigurator {
  providers: IEvmApi[];
  prepareProviders(
    configuration: ITransformedExtendedRpcInstance,
    maxProviderCount?: number
  ): Promise<void>;
  refreshProviders(latencyBelow?: number): Promise<void>;
}

export interface IRpcNode {
  rpcAddress: string;
  chainName: string;
  chainId: number;
  totalRequest: number;
  errorCount: number;
  successRate: number;
  rateLimit: number;
  latency: number;
}

export interface IRpcInstanceMetadata {
  endpoint: string;
  chainId: number;
  chainName: string;
}

export interface IJsonRpcErrorResponse {
  statusText?: string;
}

export interface IJsonRpcError {
  response?: IJsonRpcErrorResponse;
}

export interface IJsonRpcResponse<T> {
  result: T;
  error?: IJsonRpcError;
}

export interface INodeStorageRepository {
  findStartNodes(chainId: number, latency?: number): Promise<IRpcNode[]>;
  findAll(): Promise<IRpcNode[]>;
  upsert(node: IRpcNode): void;
}

export interface IEvmApi {
  errorCount: number;
  latency: number;
  totalRequests: number;
  rateLimited: number;
  rpcInstanceMetadata?: IRpcInstanceMetadata;
  getFullBlock(blockNumber: number): Promise<IFullJsonRpcBlock | null>;
  getChainId(): Promise<number>;
  getBlockNumber(): Promise<number>;
  getBlock(blockNumber?: number): Promise<any>;
  getLogs(fromBlock?: number, toBlock?: number): Promise<any>;
}

export interface IProvider {
  initialize: (
    providerRpcConfiguration: ITransformedExtendedRpcInstance,
    lastCommitted?: number
  ) => Promise<void>;
}

/*
  [
    'baseFeePerGas',   'difficulty',
    'extraData',       'gasLimit',
    'gasUsed',         'hash',
    'logsBloom',       'miner',
    'mixHash',         'nonce',
    'number',          'parentHash',
    'receiptsRoot',    'sha3Uncles',
    'size',            'stateRoot',
    'timestamp',       'totalDifficulty',
    'transactions',    'transactionsRoot',
    'uncles',          'withdrawals',
    'withdrawalsRoot'
  ]
*/
export interface IJsonRpcBlock {
  baseFeePerGas: string;
  difficulty: string;
  extraData: string;
  gasLimit: string;
  gasUsed: string;
  hash: string;
  logsBloom: string;
  miner: string;
  mixHash: string;
  nonce: string;
  number: string;
  parentHash: string;
  receiptsRoot: string;
  sha3Uncles: string;
  size: number;
  stateRoot: string;
  timestamp: string;
  totalDifficulty: string;
  transactions: IJsonRpcTransaction[];
  transactionsRoot: string;
  uncles: string[];
  withdrawals: string[];
  withdrawalsRoot: string;
}
/**
 * {blockHash: '0x4916de9e0c2e3a9364dbfb5c0951ae9897b5a17f6f1028d6383081ec34eaee1f',
 * blockNumber: '0x2e58412',
 * from: '0xb9a2ba6bb11cc60ee34669317866940df6b36a43', gas: '0x49527', gasPrice: '0x32fd6ace00', …}
 */
export interface IJsonRpcTransaction {
  blockHash: string;
  blockNumber: string;
  from: string;
  gas: string;
  gasPrice: string;
  hash: string;
  input: string;
  nonce: string;
  to: string;
  transactionIndex: string;
  value: string;
  type: string;
  readonly v: string;
  readonly r: string;
  readonly s: string;
  accessList: string[];
}

export interface IJsonRpcLog {
  address: string;
  blockHash: string;
  blockNumber: string;
  data: string;
  logIndex: string;
  removed: boolean;
  topics: string[];
  transactionHash: string;
  transactionIndex: string;
}

export interface IFullJsonRpcBlock {
  baseFeePerGas: string;
  difficulty: string;
  extraData: string;
  gasLimit: string;
  gasUsed: string;
  hash: string;
  logsBloom: string;
  miner: string;
  mixHash: string;
  nonce: string;
  blockNumber: number | null;
  parentHash: string;
  receiptsRoot: string;
  sha3Uncles: string;
  size: number;
  stateRoot: string;
  blockTimestamp: number | null;
  totalDifficulty: string;
  transactions: IJsonRpcTransaction[];
  transactionsRoot: string;
  uncles: string[];
  withdrawals: string[];
  withdrawalsRoot: string;
  chainId: number;
  logs: IJsonRpcLog[];
}
