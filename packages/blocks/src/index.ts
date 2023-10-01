import { configuration } from './configurations/Configurator';
import { emitter } from './handlers/blockNumber/BlockNumberEmitter';
import { bootstrap as bootstrapBlockNumberEventHandler } from './handlers/blockNumber/BlockNumberEventHandler';
import { bootstrap as bootstrapKafka } from './messaging/Kafka';
import { bootstrap as bootstrapTransactionConsumer } from "./messaging/TransactionConsumer";
import { bootstrap as bootstrapBlocksRetryConsumer } from "./messaging/BlocksRetryConsumer";
import { bootstrap as bootstrapKsqldb } from './ksql/KsqldbClient';
import { providers } from './providers';
import { getLastProcessedBlockNumber } from './ksql/Queries';

const catchupBlocks = async (lastProcessedNumber: number) => {
    if (!lastProcessedNumber) {
        return;
    }

    const rpcProvider = !!configuration.infura.projectId ? providers.rpc.infuraProvider : providers.rpc.fallbackJsonRpcProvider;
    const latestBlockNumber = await rpcProvider.getBlockNumber();

    for (let index = lastProcessedNumber + 1; index <= latestBlockNumber; index++) {
        emitter.addToQueue({ blockNumber: index })
    }
}

(async () => {
    await Promise.all([bootstrapKsqldb(), bootstrapKafka()]);
    await Promise.all([bootstrapTransactionConsumer(), bootstrapBlocksRetryConsumer()]);

    bootstrapBlockNumberEventHandler();

    const lastProcessedNumber = await getLastProcessedBlockNumber();

    const wssProvider = !!configuration.infura.projectId ?
        providers.wss.infuraWebSocketProvider :
        providers.wss.fallbackWebSocketProvider;
    if (!wssProvider) throw "No WSS Provider configured";

    await wssProvider.on('block', (blockNumber: number) => emitter.addToQueue({ blockNumber }));

    await catchupBlocks(lastProcessedNumber);
})();


