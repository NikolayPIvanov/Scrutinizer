/* eslint-disable node/no-extraneous-import */
import {
  IEvmApi,
  IFullJsonRpcBlock,
  INodeStorageRepository,
} from './provider.interfaces';

export class EvmApi implements IEvmApi {
  public latency = 0;
  public totalRequests = 0;
  public errorCount = 0;
  public rateLimited = 0;
  public endpointUrl: string;
  private chainId = 0;
  private chainName = 'unknown';
  private maxRequestTime = 5000;
  private requestTimes: number[] = [];
  private loggingBusy = false;

  constructor(
    private storage: INodeStorageRepository,
    public rpcInstance: {endpoint: string; chainId: number; chainName: string}
  ) {
    this.endpointUrl = rpcInstance.endpoint;
    this.chainId = rpcInstance.chainId;
    this.chainName = rpcInstance.chainName;
  }
  proxyRequest(body: unknown): Promise<any> {
    throw new Error('Method not implemented.');
  }
  getFullBlock(blockNumber: number): Promise<IFullJsonRpcBlock | null> {
    throw new Error('Method not implemented.');
  }
  getChainId(): Promise<number> {
    throw new Error('Method not implemented.');
  }
  getBlockNumber(): Promise<number> {
    throw new Error('Method not implemented.');
  }
  getBalance(address: string): Promise<string> {
    throw new Error('Method not implemented.');
  }
  getBlock(blockNumber?: number | undefined): Promise<any> {
    throw new Error('Method not implemented.');
  }

  public async getLogs(fromBlock?: number, toBlock?: number) {
    return await this.makeRequest('eth_getLogs', [
      {
        fromBlock: fromBlock ? `0x${fromBlock.toString(16)}` : 'latest',
        toBlock: toBlock ? `0x${toBlock.toString(16)}` : 'latest',
      },
    ]);
  }
}
