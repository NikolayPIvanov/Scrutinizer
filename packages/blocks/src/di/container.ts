import { Container } from "inversify";
import { Configuration } from "../configurations/configuration";
import { IBlockNumberEmitter, IBlockNumberEventHandler, IConfiguration, IEmitter, IKafkaClient, ILogger, IProvider, IScrapper, IWebSocketService, TYPES } from "../types";
import { WebSocketService } from "../websockets";
import { Logger } from "../infrastructure";
import { BlockNumberEmitter } from "../handlers/blockNumber/BlockNumberEmitter";
import { ChainListScrapper } from "../providers/ChainListScrapper";
import { KafkaClient } from "../messaging/Kafka";
import { RpcJsonProvider } from "../providers/RpcJsonProvider";
import { Emitter } from "../handlers/blockNumber/Emitter";
import { BlockNumberEventHandler } from "../handlers/blockNumber/BlockNumberEventHandler";

export const container = new Container();

export const bootstrap = () => {
    container.bind<ILogger>(TYPES.ILogger).to(Logger).inSingletonScope();
    container.bind<IEmitter>(TYPES.IEmitter).to(Emitter).inSingletonScope();
    container.bind<IBlockNumberEmitter>(TYPES.IBlockNumberEmitter).to(BlockNumberEmitter).inSingletonScope();
    container.bind<IBlockNumberEventHandler>(TYPES.IBlockNumberEventHandler).to(BlockNumberEventHandler).inSingletonScope();
    container.bind<IScrapper<any>>(TYPES.IChainListScrapper).to(ChainListScrapper).inSingletonScope();
    container.bind<IProvider>(TYPES.IProvider).to(RpcJsonProvider);
    container.bind<IConfiguration>(TYPES.IConfiguration).to(Configuration);
    container.bind<IWebSocketService>(TYPES.IWebSocketService).to(WebSocketService);
    container.bind<IKafkaClient>(TYPES.IKafkaClient).to(KafkaClient);

    container.get<IEmitter>(TYPES.IEmitter);
    container.get<IEmitter>(TYPES.IBlockNumberEmitter);
    container.get<IEmitter>(TYPES.IBlockNumberEventHandler);
}

