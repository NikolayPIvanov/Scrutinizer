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
  getFullBlock(blockNumber: number): Promise<IFullJsonRpcBlock | null>;
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
  getBlock(
    blockNumber: number,
    forceFastestProvider?: boolean
  ): Promise<IFullJsonRpcBlock | null>;
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
