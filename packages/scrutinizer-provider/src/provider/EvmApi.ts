import axios, {AxiosResponse} from 'axios';
import {requestPromisesWithTimeout, to} from './common';
import {
  IEvmApi,
  IFullJsonRpcBlock,
  IJsonRpcBlock,
  IJsonRpcError,
  IJsonRpcLog,
  IJsonRpcResponse,
  INodeStorageRepository,
  IRpcInstanceMetadata,
} from './provider.interfaces';

export class EvmApi implements IEvmApi {
  private maxRequestTime = 5000;
  private requestTimes: number[] = [];
  private loggingBusy = false;
  public latency = 0;
  public totalRequests = 0;
  public errorCount = 0;
  public rateLimited = 0;

  public rpcInstanceMetadata?: IRpcInstanceMetadata;

  constructor(
    private storageRepository: INodeStorageRepository,
    rpcInstance: IRpcInstanceMetadata
  ) {
    this.rpcInstanceMetadata = rpcInstance;
  }

  public async getFullBlock(
    blockNumber: number
  ): Promise<IFullJsonRpcBlock | null> {
    const responses = await this.makeMultiRequest<
      IJsonRpcBlock | IJsonRpcLog[]
    >([
      this.constructGetBlockRpcMethod(blockNumber),
      this.constructGetLogsRpcMethod(blockNumber, blockNumber),
    ]);

    const block = responses[0] as IJsonRpcBlock | undefined;
    const logs = responses[1] as IJsonRpcLog[] | undefined;
    if (!this.isReturnedDataValid(block, logs)) {
      return null;
    }

    return {
      ...block!,
      chainId: this.rpcInstanceMetadata!.chainId,
      blockNumber: block ? parseInt(block.number, 16) : null,
      blockTimestamp: block ? parseInt(block.timestamp, 16) : null,
      logs: logs || [],
    };
  }

  public async getChainId(): Promise<number> {
    const chainId = await this.makeRequest<string>('eth_chainId', []);
    if (!chainId) {
      throw new Error('ChainId is undefined');
    }

    return parseInt(chainId, 16);
  }

  public async getBlockNumber(): Promise<number> {
    const blockNumber = await this.makeRequest<string>('eth_blockNumber', []);
    if (!blockNumber) {
      throw new Error('BlockNumber is undefined');
    }

    return parseInt(blockNumber, 16);
  }

  public async getBlock(
    blockNumber?: number
  ): Promise<IJsonRpcBlock | undefined> {
    const parameters = this.constructGetBlockRpcMethod(blockNumber);
    const block = await this.makeRequest<IJsonRpcBlock>(
      parameters.method,
      parameters.params
    );

    return block;
  }

  public async getLogs(
    fromBlock?: number,
    toBlock?: number
  ): Promise<IJsonRpcLog[] | undefined> {
    const parameters = this.constructGetLogsRpcMethod(fromBlock, toBlock);

    return this.makeRequest<IJsonRpcLog[]>(
      parameters.method,
      parameters.params
    );
  }

  private isReturnedDataValid(
    block: IJsonRpcBlock | undefined,
    logs: IJsonRpcLog[] | undefined
  ) {
    if (!block || !logs) {
      this.errorCount++;
      return false;
    }

    try {
      parseInt(block.number, 16);
      parseInt(block.timestamp, 16);
    } catch (error) {
      this.errorCount++;

      return false;
    }

    return true;
  }

  private constructGetLogsRpcMethod(
    fromBlock?: number,
    toBlock?: number
  ): {
    method: string;
    params: unknown[];
  } {
    return {
      method: 'eth_getLogs',
      params: [
        {
          fromBlock: fromBlock ? `0x${fromBlock.toString(16)}` : 'latest',
          toBlock: toBlock ? `0x${toBlock.toString(16)}` : 'latest',
        },
      ],
    };
  }

  private constructGetBlockRpcMethod(blockNumber?: number): {
    method: string;
    params: unknown[];
  } {
    return {
      method: 'eth_getBlockByNumber',
      params: [blockNumber ? `0x${blockNumber.toString(16)}` : 'latest', true],
    };
  }

  private async makeMultiRequest<T>(
    requests: {method: string; params: unknown[]}[]
  ): Promise<T[]> {
    const startTime = Date.now();
    this.totalRequests++;

    try {
      const [response, error] = await to(
        requestPromisesWithTimeout<AxiosResponse<IJsonRpcResponse<T>[]>>(
          axios.post(
            this.rpcInstanceMetadata!.endpoint,
            requests.map((request, index) => ({
              jsonrpc: '2.0',
              id: index + 1,
              method: request.method,
              params: request.params,
            })),
            {
              headers: {
                'Content-Type': 'application/json',
              },
              timeout: this.maxRequestTime,
            }
          )
        )
      );

      const message = error || response?.data;
      const converted = this.convertError(message as IJsonRpcError);
      this.handleError(converted);

      return response?.data.map(response => response.result) || [];
    } catch (error) {
      this.errorCount++;

      throw error;
    } finally {
      this.logPerformance(startTime);
    }
  }

  private async makeRequest<T>(method: string, params: unknown[]) {
    const startTime = Date.now();
    this.totalRequests++;

    try {
      const [response, error] = await to(
        axios.post<IJsonRpcResponse<T>>(
          this.rpcInstanceMetadata!.endpoint,
          {
            jsonrpc: '2.0',
            id: 1,
            method,
            params,
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: this.maxRequestTime,
          }
        )
      );

      if (error) {
        this.handleError(this.convertError(error));
        return;
      }

      const json = response!.data;

      this.handleError([response!.data as any]);

      return json.result;
    } catch (error) {
      this.errorCount++;

      throw error;
    } finally {
      this.logPerformance(startTime);
    }
  }

  private convertError(error: IJsonRpcError): {
    error?: {message?: string | undefined} | undefined;
  }[] {
    return [
      {
        error: {
          message: error.response?.statusText,
        },
      },
    ];
  }

  private handleError(json: {error?: {message?: string}}[]) {
    const errors = json.filter(j => !!j.error);
    if (!errors.length) return;

    this.errorCount += errors.length;

    errors.map(e => this.handleSingleError(e));
  }

  private handleSingleError(json: {error?: {message?: string}}) {
    if (json.error?.message?.includes('usage limit')) {
      this.rateLimited++;
    }

    if (json.error?.message?.includes('limit exceeded')) {
      this.rateLimited++;
    }
    if (json.error?.message?.includes('reached')) {
      this.rateLimited++;
    }
    if (json.error?.message?.includes('Too Many Requests')) {
      this.rateLimited++;
    }
    if (json.error?.message?.includes('Unauthorized')) {
      this.rateLimited++;
    }

    if (json.error?.message) {
      throw new Error('RPC Error: ' + json.error.message);
    }
  }

  private async logPerformance(startTime: number | null = null) {
    if (this.loggingBusy) {
      return;
    }

    try {
      this.loggingBusy = true;

      if (startTime) {
        this.latency = Date.now() - startTime;
        this.requestTimes.push(this.latency);
      }

      // Keep only the last 50 request times
      if (this.requestTimes.length > 50) {
        this.requestTimes.slice(-50);
      }

      const averageLatency =
        this.requestTimes.reduce((sum, t) => sum + t, 0) /
          this.requestTimes.length || 0;

      await this.storageRepository.upsert({
        chainName: this.rpcInstanceMetadata!.chainName,
        chainId: this.rpcInstanceMetadata!.chainId,
        totalRequest: this.totalRequests,
        successRate:
          (this.totalRequests - this.errorCount) / this.totalRequests,
        rpcAddress: this.rpcInstanceMetadata!.endpoint,
        latency: averageLatency,
        errorCount: this.errorCount,
        rateLimit: this.rateLimited,
      });

      // Wait 5 seconds before logging again
      await new Promise(resolve => setTimeout(resolve, 5000));
    } finally {
      this.loggingBusy = false;
    }
  }
}
