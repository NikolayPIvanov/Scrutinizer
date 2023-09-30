"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initialize = void 0;
const Kafka_1 = require("./Kafka");
const axios_1 = require("axios");
const Configurator_1 = require("./Configurator");
const process = async (hashes) => {
    const endpoint = `https://mainnet.infura.io/v3/${Configurator_1.configuration.infura.projectId}`;
    const reqs = hashes.map((hash, index) => ({
        jsonrpc: "2.0",
        id: index + 1,
        method: "eth_getTransactionReceipt",
        params: [hash]
    }));
    const client = axios_1.default.create({
        baseURL: endpoint,
        headers: { 'Content-Type': 'application/json' }
    });
    const body = reqs;
    try {
        const res = await client.post("", body);
        return res.data.map(({ result }) => result).filter((r) => !!r);
    }
    catch (e) {
        console.log(e);
        return [];
    }
};
const consumer = Kafka_1.kafka.consumer({
    groupId: 'test-group'
});
const initialize = async () => {
    await consumer.connect();
    await consumer.subscribe({ topic: 'transactions', fromBeginning: true });
    await consumer.run({
        eachBatchAutoResolve: false,
        eachBatch: async ({ batch, resolveOffset, heartbeat, isRunning, isStale }) => {
            if (!isRunning() || isStale())
                return;
            const hashes = batch.messages
                .map((message) => message.value)
                .filter((value) => !!value)
                .map((value) => JSON.parse(value.toString()))
                .map(v => v.hash);
            const receipts = await process(hashes);
            await Kafka_1.producer.send({
                topic: "receipts",
                messages: receipts.map((receipt) => ({
                    value: JSON.stringify(receipt)
                }))
            });
            resolveOffset(batch.messages[batch.messages.length - 1].offset);
            await heartbeat();
        }
    });
};
exports.initialize = initialize;
//# sourceMappingURL=TransactionConsumer.js.map