import axios from 'axios';
import {to} from '../common';
import {IEvmApi, INodeStorageRepository} from './provider.interfaces';
import {requestPromisesWithTimeout} from './utils';

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

  public proxyRequest = async (body: unknown) => {
    const startTime = Date.now();
    this.totalRequests++;

    try {
      const response = await axios.post(this.endpointUrl, body, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: this.maxRequestTime,
      });

      this.handleError(response.data);

      this.logPerformance(startTime);

      return response.data;
    } catch (error) {
      this.errorCount++;

      throw error;
    }
  };

  public async getFullBlock(blockNumber: number) {
    const result = await this.makeMultiRequest([
      {
        method: 'eth_getBlockByNumber',
        params: [`0x${blockNumber.toString(16)}`, true],
      },
      {
        method: 'eth_getLogs',
        params: [
          {
            fromBlock: `0x${blockNumber.toString(16)}`,
            toBlock: `0x${blockNumber.toString(16)}`,
          },
        ],
      },
    ]);

    const block = result[0];
    const logs = result[1];

    try {
      parseInt(block.number, 16);
      parseInt(block.timestamp, 16);
    } catch (error) {
      this.errorCount++;
    }

    // block.transactions = block.transactions.map((tx: any) => ({
    //   ...tx,
    //   value: parseInt(tx.value, 16),
    //   gas: parseInt(tx.gas, 16),
    //   gasPrice: parseInt(tx.gasPrice, 16),
    //   nonce: parseInt(tx.nonce, 16),
    //   blockNumber: parseInt(tx.blockNumber, 16),
    //   transactionIndex: parseInt(tx.transactionIndex, 16),
    //   logs: logs.filter((l: any) => l.transactionHash === tx.hash),
    // }));

    // const receipts: any[] = await this.getTransactionReceipts(block, logs);

    return {
      ...block,
      chainId: this.chainId,
      blockNumber: block ? parseInt(block.number, 16) : null,
      blockTimestamp: block ? parseInt(block.timestamp, 16) : null,
      txLogs: logs,
      receipts: [],
    };
  }

  public async getChainId() {
    return parseInt(await this.makeRequest('eth_chainId', []), 16);
  }

  public async getBlockNumber() {
    return parseInt(await this.makeRequest('eth_blockNumber', []), 16);
  }

  public async getBalance(address: string) {
    return await this.makeRequest('eth_getBalance', [address, 'latest']);
  }

  public async getBlock(blockNumber?: number) {
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

    return await this.makeRequest('eth_getBlockByNumber', [
      blockNumber ? `0x${blockNumber.toString(16)}` : 'latest',
      true,
    ]);
  }

  public async getLogs(fromBlock?: number, toBlock?: number) {
    return await this.makeRequest('eth_getLogs', [
      {
        fromBlock: fromBlock ? `0x${fromBlock.toString(16)}` : 'latest',
        toBlock: toBlock ? `0x${toBlock.toString(16)}` : 'latest',
      },
    ]);
  }

  private async makeMultiRequest(
    requests: {method: string; params: unknown[]}[]
  ) {
    const startTime = Date.now();
    this.totalRequests++;

    try {
      const response = await requestPromisesWithTimeout(
        axios.post(
          this.endpointUrl,
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
      );

      const json = await response.data;

      this.handleError(json);

      this.logPerformance(startTime);

      return json.map((response: any) => response.result);
    } catch (error) {
      this.errorCount++;

      this.logPerformance();

      throw error;
    }
  }

  private async makeRequest(method: string, params: unknown[]) {
    const startTime = Date.now();
    this.totalRequests++;

    try {
      const [response, error] = await to(
        axios.post(
          this.endpointUrl,
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
        this.handleError([
          {
            error: {
              message: (error as any).response.statusText,
            },
          },
        ]);
        this.logPerformance(startTime);

        return;
      }

      const json = response!.data;

      this.handleError([json]);

      this.logPerformance(startTime);

      return json.result;
    } catch (error) {
      this.errorCount++;

      throw error;
    }
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

      // Keep only the last 10 request times
      if (this.requestTimes.length > 10) {
        this.requestTimes.slice(-10);
      }

      const averageLatency =
        this.requestTimes.reduce((sum, t) => sum + t, 0) /
          this.requestTimes.length || 0;

      await this.storage.upsert({
        chainName: this.chainName,
        chainId: this.chainId,
        totalRequest: this.totalRequests,
        successRate:
          (this.totalRequests - this.errorCount) / this.totalRequests,
        rpcAddress: this.endpointUrl,
        latency: averageLatency,
        errorCount: this.errorCount,
        rateLimit: this.rateLimited,
      });

      // Wait 5 seconds before logging again
      await new Promise(resolve => setTimeout(resolve, 5000));
    } catch (error) {
      console.log('LogPerf error:', error);
    } finally {
      this.loggingBusy = false;
    }
  }
}
