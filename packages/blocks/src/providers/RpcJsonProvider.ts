import { inject, injectable } from "inversify"
import { TYPES, ILogger, IProviderRpcConfiguration, IBlockNumberEmitter, IProvider } from "../types"
import { EthereumAPI } from "./EthereumAPI";
import { constants } from "../handlers/constants";
import { RequestMultiplePromisesWithTimeout } from "./utils";
import { to } from "../utils";

export const getConsensusValue = (arr: number[]) => {
    const frequency = new Map();
    let maxCount = 0;
    let consensusValue = 0;

    if (arr.length === 0) {
        throw new Error("Cannot get consensus value of empty array");
    }

    for (const value of arr) {
        const count = frequency.get(value) || 0;
        frequency.set(value, count + 1);

        if (count + 1 > maxCount) {
            maxCount = count + 1;
            consensusValue = value;
        }
    }

    return consensusValue;
};

@injectable()
export class RpcJsonProvider implements IProvider {
    private readonly maxProviderCount = 5;
    private readonly providers: EthereumAPI[] = [];
    private readonly allProviders: EthereumAPI[] = [];

    private maxRequestTime: number = 500;
    private refreshProvidersInterval: number = 15000;
    private maxProxyRequestTime: number = 5000;
    private latestBlock: number = 0;
    private blockLag: number = 0;
    private blockTime: number = 0.25 * 1000; // ETH default block time
    private intervalHandler!: NodeJS.Timer;
    private readonly logging: boolean | undefined;

    private providerRpcConfiguration: IProviderRpcConfiguration | undefined;

    constructor(@inject(TYPES.IBlockNumberEmitter) private emitter: IBlockNumberEmitter,
        @inject(TYPES.ILogger) private logger: ILogger) { }

    public initialize = async (providerRpcConfiguration: IProviderRpcConfiguration) => {
        this.providerRpcConfiguration = providerRpcConfiguration;

        await this.loadProviders();

        this.start();
    }

    private async loadProviders() {
        const providers = this.providerRpcConfiguration?.rpcs!
            .map(rpc => new EthereumAPI(rpc, this.providerRpcConfiguration?.chainId!, this.providerRpcConfiguration?.name!));

        providers?.forEach(async (provider) => {
            this.allProviders.push(provider);

            if (this.providers.length >= this.maxProviderCount) {
                return;
            }

            const [chainId, error] = await to(provider.getChainId());
            if (error) {
                this.logger.error(error);
            }

            if (chainId === this.providerRpcConfiguration?.chainId) {
                this.providers.push(provider);
            }
        });
    }

    private start() {
        this.initializeBlockTimeCalculation();
        this.initializePeriodicProviderRefresh();
        this.initializePeriodicBlockLag();

        this.fetchBlocks();
    }

    private initializeBlockTimeCalculation = () => {
        const period = 1000 * Math.random();

        setTimeout(async () => {
            const [, error] = await to(this.calculateBlockTime());
            if (error) {
                this.logger.error("calculateBlockTime", error);
            }
        }, period); // increase to more than 1 second - between 1 and 10 seconds.
    }

    private initializePeriodicProviderRefresh = () => setInterval(() => this.refreshProviders(), this.refreshProvidersInterval);

    private initializePeriodicBlockLag = () => {
        const BLOCKS_PERIOD = 30;

        setInterval(() => {
            try {
                this.calculateBlockLag();

                if (this.blockLag > 1) {
                    this.refreshProviders();
                }
            } catch (error) {
            }
        }, this.blockTime * BLOCKS_PERIOD);
    }

    private async fetchBlocks(): Promise<void> {
        if (this.providers.length === 0) {
            await new Promise((resolve) => setTimeout(resolve, 100));
            return this.fetchBlocks();
        }

        try {
            if (this.latestBlock === 0) {
                await this.getBlockNumber();
            }

            // If we have block_lag more than 10, we can fetch the next
            if (this.blockLag <= 2) {
                await this.getNextBlock(this.latestBlock);
            } else if (this.blockLag > 2 && this.blockLag < 10) {
                await this.getNextBlock(this.latestBlock, this.getFastestProvider());
            } else {
                this.logger.info(`Lag is ${this.blockLag}, catching up now!`)
                const parameters = [];
                const provider = this.getFastestProvider();
                const fillBlocks = this.blockLag / 2;
                for (let i = 0; i < fillBlocks; i++) {
                    parameters.push(this.latestBlock + i)
                }

                const results = await Promise.all(parameters.map(async parameter => {
                    const [, error] = await to(this.getNextBlock(parameter, provider));
                    return { parameter, errored: !!error, reason: error };
                }));

                const erroredBlocks =
                    results.filter(r => r.errored).sort((a, b) => a.parameter - b.parameter);

                if (erroredBlocks.length) {
                    this.logger.info(`Errored: ${erroredBlocks.map(e => e.parameter)}`)
                    this.logger.error(`There was errored at: ${erroredBlocks[0].parameter}, reason: ${erroredBlocks[0].reason}`)
                    this.latestBlock = erroredBlocks[0].parameter; // continue from the first errored.
                }

                await this.calculateBlockLag();
            }
        } catch (error) {
            this.logger.error({ error, method: "Timeout", blockTime: this.blockTime })
            await new Promise((resolve) => setTimeout(resolve, this.blockTime));
        } finally {
            return this.fetchBlocks();
        }
    }

    async getNextBlock(blockNumber: number, forcedProvider?: EthereumAPI) {
        const time = Date.now();

        const blockFull = await this.getFullBlock(blockNumber + 1, forcedProvider);

        if (Date.now() - time > this.maxRequestTime) {
            this.refreshProviders();
        }

        this.emitter.addToQueue({
            block: blockFull,
        });

        if (blockFull.blockNumber > this.latestBlock) {
            this.latestBlock = blockFull.blockNumber;
        }

    }

    async getFullBlock(blockNumber: number, forcedProvider?: EthereumAPI) {
        try {
            if (forcedProvider) {
                return forcedProvider.getFullBlock(blockNumber);
            }

            const promises = this.providers.map((provider) => {
                return provider.getFullBlock(blockNumber);
            });

            const { success, error } = await RequestMultiplePromisesWithTimeout(
                promises,
                this.maxRequestTime
            );

            const validated = success
                .filter(
                    (e) => e?.number && e?.timestamp && e?.transactions && e?.txLogs
                )
                .sort((a, b) => b.txLogs?.length - a.txLogs?.length);

            const bestBlock = validated.find(
                (block) =>
                    block?.number &&
                    block?.timestamp &&
                    block?.transactions?.length > 0 &&
                    block?.txLogs?.length > 0
            );

            if (bestBlock) {
                return bestBlock;
            }

            if (validated[0]) {
                return validated[0];
            }
        } catch (error) {
            this.logger.error(error);
        }

        throw new Error(`No valid block found! Chain: ${this.providerRpcConfiguration?.name}`);
    }

    async calculateBlockLag() {
        const promises = this.providers.map((provider) => provider.getBlockNumber());
        const { success } = await RequestMultiplePromisesWithTimeout(
            promises,
            this.maxRequestTime
        );

        const latestBlock = getConsensusValue(success);
        if (latestBlock) {
            this.blockLag = latestBlock - this.latestBlock;
        }
    }

    async calculateBlockTime() {
        await this.getBlockNumber();

        const blockNumber = this.latestBlock;

        const [latestBlock, prevBlock] = await Promise.all([this.getFullBlock(blockNumber), this.getFullBlock(blockNumber - 1)]);

        const blockTime = latestBlock.blockTimestamp - prevBlock.blockTimestamp;

        // BlockTime is UnixTimeStamp
        const previousBlockTime = this.blockTime;
        this.blockTime = Math.max(this.blockTime, blockTime * 1000);

        this.logger.info(`Block time is ${this.blockTime}, was ${previousBlockTime}`)
    }

    private getFastestProvider() {
        const fasterProvider = this.providers
            .filter((e) => e.errorCount === 0)
            .sort((a, b) => a.latency - b.latency)?.[0];

        return fasterProvider ?? null;
    }

    private async refreshProviders() {
        try {
            const availableProviders = this.allProviders.filter(
                (e) => !this.providers.find((k) => k.endpointUrl === e.endpointUrl)
            );

            if (availableProviders.length < 1) {
                return;
            }

            if (this.providers.filter((e) => e.errorCount > 0 || e.latency > 500)
                .length === 0
            ) {
                return;
            }

            if (Math.random() > 0.5) {
                this.providers.sort((a, b) => a.errorCount - b.errorCount);
            } else {
                this.providers.sort((a, b) => a.latency - b.latency);
            }

            const nextProvider =
                availableProviders[Math.floor(Math.random() * availableProviders.length)];

            try {
                await nextProvider.getFullBlock(this.latestBlock);

                const chainId = await nextProvider.getChainId();

                if (chainId === this.providerRpcConfiguration?.chainId!) {
                    this.providers.pop();

                    this.providers.push(nextProvider);
                }
            } catch (error) {
                throw error;
            }
        } catch (error) {
        }
    }

    private async getBlockNumber() {
        const promises = this.providers.map((provider) => provider.getBlockNumber());

        const { success, error } = await RequestMultiplePromisesWithTimeout(
            promises,
            this.maxRequestTime
        );

        const latestBlock = getConsensusValue(success);
        if (latestBlock) {
            this.latestBlock = getConsensusValue(success);
        } else {
            this.logger.error("Error: ", "Cannot GetConsensusValue latestBlock");
        }
    }

}