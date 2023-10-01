import { emitter } from './handlers/blockNumber/BlockNumberEmitter';
import { bootstrap as bootstrapBlockNumberEventHandler } from './handlers/blockNumber/BlockNumberEventHandler';
import { bootstrap as bootstrapKafka } from './messaging/Kafka';
import { bootstrap as bootstrapTransactionConsumer } from "./messaging/TransactionConsumer";
import { providers } from './providers';


(async () => {
    await bootstrapKafka();
    await bootstrapTransactionConsumer();

    bootstrapBlockNumberEventHandler();

    await providers.wss.infuraWebSocketProvider.on(
        'block', (blockNumber: number) => emitter.addToQueue(blockNumber))
})();


