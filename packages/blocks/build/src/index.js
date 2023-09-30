"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
const Configurator_1 = require("./Configurator");
const BlockNumberEmitter_1 = require("./BlockNumberEmitter");
const BlockProcessor_1 = require("./BlockProcessor");
const Kafka_1 = require("./Kafka");
const TransactionConsumer_1 = require("./TransactionConsumer");
(0, BlockProcessor_1.listener)();
(async () => {
    await (0, Kafka_1.initialize)();
    await (0, TransactionConsumer_1.initialize)();
    const provider = new ethers_1.InfuraWebSocketProvider(ethers_1.Network.from(Configurator_1.configuration.network.chainId), Configurator_1.configuration.infura.projectId);
    await provider.on('block', (blockNumber) => BlockNumberEmitter_1.default.process(blockNumber));
})();
//# sourceMappingURL=index.js.map