
import { InfuraWebSocketProvider, Network } from 'ethers';
import { configuration } from './Configurator'
import blockNumberEmitter from './BlockNumberEmitter';
import { listener } from './BlockProcessor';
import { initialize } from './Kafka';
import { initialize as consumerInit } from "./TransactionConsumer";

listener();

(async () => {
    await initialize();
    await consumerInit();

    const provider = new InfuraWebSocketProvider(Network.from(configuration.network.chainId), configuration.infura.projectId);

    await provider.on('block', (blockNumber) => blockNumberEmitter.process(blockNumber))
})();


