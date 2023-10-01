import { emitter } from './handlers/blockNumber/BlockNumberEmitter';
import { bootstrap as bootstrapBlockNumberEventHandler } from './handlers/blockNumber/BlockNumberEventHandler';
import { bootstrap as bootstrapKafka, bootstrapAdmin } from './messaging/Kafka';
import { bootstrap as bootstrapTransactionConsumer } from "./messaging/TransactionConsumer";
import { bootstrap as bootstrapBlockConsumer } from "./messaging/BlockConsumer";
import { providers } from './providers';


(async () => {
    await bootstrapKafka();
    await bootstrapAdmin();
    await bootstrapTransactionConsumer();
    await bootstrapBlockConsumer();

    bootstrapBlockNumberEventHandler();

    await providers.wss.infuraWebSocketProvider.on(
        'block', (blockNumber: number) => emitter.addToQueue(blockNumber))
})();


