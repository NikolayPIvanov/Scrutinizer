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
    let received = Date.now();

    const initListener = async () => {
        const wssProviderFactory = !!configuration.infura.projectId ?
            providers.wss.infuraWebSocketProviderFactory :
            providers.wss.fallbackWebSocketProviderFactory;

        if (!wssProviderFactory) throw "No WSS Provider configured!";

        const provider = wssProviderFactory();
        if (!provider) throw "Could not create WSS Provider!";

        return provider.on('block', (blockNumber: number) => {
            received = Date.now();
            emitter.addToQueue({ blockNumber });
        });
    }

    let wssProvider = await initListener();
    setInterval(async () => {
        const timeSinceLastEvent = Date.now() - received;

        // If we have not received anything for 1 minute, either chain has stopped or provider has cut us off.
        // This is why we can force recreate.
        if (timeSinceLastEvent > 20000) {
            await wssProvider.destroy();
            wssProvider = await initListener();
        }
    }, 5000);


    await catchupBlocks(lastProcessedNumber);
})();


