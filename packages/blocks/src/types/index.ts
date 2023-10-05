import { WebSocketProvider } from "ethers";
import { Producer } from "kafkajs";
import { EventEmitter } from "stream";

export { WebSocketProvider };

export const TYPES = {
    ILogger: Symbol("ILogger"),
    IEmitter: Symbol("IEmitter"),
    IProvider: Symbol("IProvider"),
    IConfiguration: Symbol("IConfiguration"),
    IBlockNumberEventHandler: Symbol("IBlockNumberEventHandler"),
    IWebSocketService: Symbol("IWebSocketService"),
    IBlockNumberEmitter: Symbol("IBlockNumberEmitter"),
    IChainListScrapper: Symbol("IChainListScrapper"),
    IKafkaClient: Symbol("IKafkaClient"),
};

export interface IProviderRpcConfiguration {
    rpcs: string[],
    chainId: number,
    name: string
}

export interface IKafkaClient {
    producer: Producer;
    bootstrap: () => Promise<void>;
}

export interface IScrapper<T> {
    scrape: () => Promise<T[]>
}

export interface IProvider {
    initialize: (providerRpcConfiguration: IProviderRpcConfiguration) => Promise<void>
}

export interface IBlockNumberEventHandler {
}

export interface IEmitter {
    instance: EventEmitter;
}

export interface IBlockNumberEmitter {
    addToQueue(job: IBlockJob): void
    // on<T, R>(topic: string, action: (args: T) => Promise<R>): IBlockNumberEmitter
}

export interface ILogger {
    info: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    error: (...args: any[]) => void;
}

export interface IBlock {
    hash: string;
    parentHash: string;
    number: string;
    timestamp: number;
    chainId: number;
    txLogs: any[]
}

export interface IBlockJob {
    block: IBlock,
    retries?: number | undefined,
    callback?: () => void
}

export interface IWebSocketService {
    subscribeOnBlockEvent: () => Promise<WebSocketProvider>
}

export interface INetworkConfiguration {
    chainId: number
}

export interface IFallbackConfiguration {
    url: string | undefined,
    wss: string | undefined,
}

export interface IInfuraConfiguration {
    projectId: string | undefined,
    baseUrl: string | undefined,
}

export interface IKafkaConfiguration {
    clientId: string | undefined,
    brokers: string[],
    topics: ITopicsConfiguration,
    groups: IGroupConfiguration
}

export interface IGroupConfiguration {
    transactions: string,
    blockNumberRetry: string,
}
export interface ITopicsConfiguration {
    blocks: string,
    duplicateBlocks: string,
    blocksNumberRetry: string,
    transactions: string,
    receipts: string,
}

export interface ILoggingConfiguration {
    level: string
}

export interface IConfiguration {
    logging: ILoggingConfiguration,
    kafka: IKafkaConfiguration,
    infura: IInfuraConfiguration,
    fallback: IFallbackConfiguration,
    network: INetworkConfiguration
}