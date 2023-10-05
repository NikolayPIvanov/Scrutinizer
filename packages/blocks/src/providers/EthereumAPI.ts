import { NodeStorageRepository } from "./NodeStorageRepository";
import axios from "axios";
import { RequestPromisesWithTimeout } from "./utils";

export class EthereumAPI {
    private storage: NodeStorageRepository;
    public latency: number = 0;
    public totalRequests: number = 0;
    public errorCount: number = 0;
    public rateLimited: number = 0;
    private maxRequestTime: number = 5000;
    private requestTimes: number[] = [];
    private loggingBusy: boolean = false;

    constructor(
        public endpointUrl: string,
        private chainId: number,
        private chainName: string
    ) {
        this.storage = NodeStorageRepository.getInstance();
    }

    public ProxyRequest = async (body: any) => {
        const startTime = Date.now();
        this.totalRequests++;

        try {

            const response = await axios.post(this.endpointUrl, body, {
                headers: {
                    "Content-Type": "application/json",
                },
                timeout: this.maxRequestTime
            })

            this.HandleError(response.data);

            this.LogPerf(startTime);

            return response.data;
        } catch (error) {
            this.errorCount++;

            throw error;
        }
    };

    private async MakeMultiRequest(
        requests: { method: string; params: any[] }[]
    ) {
        const startTime = Date.now();
        this.totalRequests++;

        try {
            const response = await RequestPromisesWithTimeout(axios.post(this.endpointUrl, requests.map((request, index) => ({
                jsonrpc: "2.0",
                id: index + 1,
                method: request.method,
                params: request.params,
            })), {
                headers: {
                    "Content-Type": "application/json",
                },
                timeout: this.maxRequestTime
            }));

            const json = await response.data;

            this.HandleError(json);

            this.LogPerf(startTime);

            return json.map((response: any) => response.result);
        } catch (error) {
            this.errorCount++;

            throw error;
        }
    }

    private async MakeRequest(method: string, params: any[]) {
        const startTime = Date.now();
        this.totalRequests++;

        try {

            const response = await axios.post(this.endpointUrl, {
                jsonrpc: "2.0",
                id: 1,
                method,
                params,
            }, {
                headers: {
                    "Content-Type": "application/json",
                },
                timeout: this.maxRequestTime
            })

            const json = await response.data;

            this.HandleError(json);

            this.LogPerf(startTime);

            return json.result;
        } catch (error) {
            this.errorCount++;

            throw error;
        }
    }

    async getFullBlock(blockNumber: number) {
        const result = await this.MakeMultiRequest([
            {
                method: "eth_getBlockByNumber",
                params: [`0x${blockNumber.toString(16)}`, true],
            },
            {
                method: "eth_getLogs",
                params: [
                    {
                        fromBlock: `0x${blockNumber.toString(16)}`,
                        toBlock: `0x${blockNumber.toString(16)}`,
                    },
                ],
            },
        ]);

        try {
            parseInt(result[0].number, 16);
            parseInt(result[0].timestamp, 16);
        } catch (error) {
            this.errorCount++;
        }

        return {
            chainId: this.chainId,
            blockNumber: !!result[0] ? parseInt(result[0].number, 16) : null,
            blockTimestamp: !!result[0] ? parseInt(result[0].timestamp, 16) : null,
            ...result[0],
            txLogs: result[1],
        };
    }

    async getChainId() {
        return parseInt(await this.MakeRequest("eth_chainId", []), 16);
    }

    async getBlockNumber() {
        return parseInt(await this.MakeRequest("eth_blockNumber", []), 16);
    }

    async getBalance(address: string) {
        return parseInt(
            await this.MakeRequest("eth_getBalance", [address, "latest"]),
            16
        );
    }

    async getBlock(blockNumber?: number) {
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

        return await this.MakeRequest("eth_getBlockByNumber", [
            blockNumber ? `0x${blockNumber.toString(16)}` : "latest",
            true,
        ]);
    }

    async getLogs(fromBlock?: number, toBlock?: number) {
        return await this.MakeRequest("eth_getLogs", [
            {
                fromBlock: fromBlock ? `0x${fromBlock.toString(16)}` : "latest",
                toBlock: toBlock ? `0x${toBlock.toString(16)}` : "latest",
            },
        ]);
    }

    private HandleError(json: any) {
        if (!json.error) return;

        this.errorCount++;

        let knownError = false;

        if (json.error.message?.includes("usage limit")) {
            this.rateLimited++;
            knownError = true;
        }

        if (json.error.message?.includes("limit exceeded")) {
            this.rateLimited++;
            knownError = true;
        }
        if (json.error.message?.includes("reached")) {
            this.rateLimited++;
            knownError = true;
        }
        if (json.error.message?.includes("Too Many Requests")) {
            this.rateLimited++;
            knownError = true;
        }

        if (json.error.message) {
            throw new Error("RPC Error: " + json.error.message);
        }
    }

    private async LogPerf(startTime: number) {
        if (this.loggingBusy) {
            return;
        }

        try {
            this.loggingBusy = true;

            this.latency = Date.now() - startTime;
            this.requestTimes.push(this.latency);

            // Keep only the last 10 request times
            if (this.requestTimes.length > 10) {
                this.requestTimes.slice(-10);
            }

            const averageLatency =
                this.requestTimes.reduce((sum, t) => sum + t, 0) /
                this.requestTimes.length;

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
            await new Promise((resolve) => setTimeout(resolve, 5000));
        } catch (error) {
            console.log("LogPerf error:", error);
        } finally {
            this.loggingBusy = false;
        }
    }
}