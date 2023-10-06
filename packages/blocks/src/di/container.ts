import {Container} from 'inversify';
import {Configuration} from '../configurations/configuration';
import {BlockNumberEmitter} from '../handlers/blockNumber/BlockNumberEmitter';
import {BlockNumberEventHandler} from '../handlers/blockNumber/BlockNumberEventHandler';
import {Emitter} from '../handlers/blockNumber/Emitter';
import {Logger} from '../infrastructure';
import {KafkaClient} from '../messaging/Kafka';
import {ChainListScrapper} from '../providers/ChainListScrapper';
import {RpcJsonProvider} from '../providers/RpcJsonProvider';
import {
  IBlockNumberEmitter,
  IBlockNumberEventHandler,
  IConfiguration,
  IEmitter,
  IKafkaClient,
  ILogger,
  IProvider,
  IScrapper,
  IWebSocketService,
  TYPES,
} from '../types';
import {WebSocketService} from '../websockets';

export const container = new Container();

export const bootstrap = () => {
  container.bind<ILogger>(TYPES.ILogger).to(Logger).inSingletonScope();
  container.bind<IEmitter>(TYPES.IEmitter).to(Emitter).inSingletonScope();
  container
    .bind<IBlockNumberEmitter>(TYPES.IBlockNumberEmitter)
    .to(BlockNumberEmitter)
    .inSingletonScope();
  container
    .bind<IBlockNumberEventHandler>(TYPES.IBlockNumberEventHandler)
    .to(BlockNumberEventHandler)
    .inSingletonScope();
  container
    .bind<IScrapper<any>>(TYPES.IChainListScrapper)
    .to(ChainListScrapper)
    .inSingletonScope();
  container.bind<IProvider>(TYPES.IProvider).to(RpcJsonProvider);
  container.bind<IConfiguration>(TYPES.IConfiguration).to(Configuration);
  container
    .bind<IWebSocketService>(TYPES.IWebSocketService)
    .to(WebSocketService);
  container.bind<IKafkaClient>(TYPES.IKafkaClient).to(KafkaClient);

  createSingletons(container);
};

const createSingletons = (container: Container) => {
  container.get<ILogger>(TYPES.ILogger);
  container.get<IEmitter>(TYPES.IEmitter);
  container.get<IBlockNumberEmitter>(TYPES.IBlockNumberEmitter);
  container.get<IBlockNumberEventHandler>(TYPES.IBlockNumberEventHandler);
  container.get<IScrapper<any>>(TYPES.IChainListScrapper);
};
