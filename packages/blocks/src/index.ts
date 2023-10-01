import { emitter } from './handlers/blockNumber/BlockNumberEmitter';
import { bootstrap as bootstrapBlockNumberEventHandler } from './handlers/blockNumber/BlockNumberEventHandler';
import { bootstrap as bootstrapKafka } from './messaging/Kafka';
import { bootstrap as bootstrapTransactionConsumer } from "./messaging/TransactionConsumer";
import { providers } from './providers';

const KsqldbClient = require("ksqldb-client");

const client = new KsqldbClient({
    host: "http://localhost",
    port: 8088,
});

(async () => {
    await client.connect();


    const { data } = await client.query("SELECT * FROM block_number_latest;");
    const { rows } = data;
    const lastProcessed = rows[0].number;

    await bootstrapKafka();
    await bootstrapTransactionConsumer();

    bootstrapBlockNumberEventHandler();

    await providers.wss.infuraWebSocketProvider.on(
        'block', (blockNumber: number) => emitter.addToQueue(blockNumber));

    const latestChain = await providers.rpc.infuraProvider.getBlockNumber();

    console.log(lastProcessed, latestChain, latestChain - lastProcessed)

    for (let index = lastProcessed + 1; index <= latestChain; index++) {
        emitter.addToQueue(index)
    }
})();


