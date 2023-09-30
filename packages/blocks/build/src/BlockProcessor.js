"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listener = void 0;
const ethers_1 = require("ethers");
const BlockNumberEmitter_1 = require("./BlockNumberEmitter");
const Configurator_1 = require("./Configurator");
const Kafka_1 = require("./Kafka");
const provider = new ethers_1.JsonRpcProvider(Configurator_1.configuration.fallback.url, ethers_1.Network.from(Configurator_1.configuration.network.chainId));
const getBlockWithTransactions = async (blockNumber) => {
    const block = await provider.getBlock(blockNumber, true);
    if (!(block === null || block === void 0 ? void 0 : block.prefetchedTransactions))
        return;
    await Kafka_1.producer.sendBatch({
        acks: 1,
        topicMessages: [
            {
                topic: "transactions",
                messages: block === null || block === void 0 ? void 0 : block.prefetchedTransactions.map(({ blockHash, blockNumber, chainId, value, hash, data, gasLimit, gasPrice, maxFeePerGas, maxPriorityFeePerGas, type, from, to, nonce }) => ({
                    value: JSON.stringify({ blockHash, blockNumber, chainId: +(chainId === null || chainId === void 0 ? void 0 : chainId.toString()) || Configurator_1.configuration.network.chainId, data, value: value === null || value === void 0 ? void 0 : value.toString(), hash, gasLimit: +gasLimit.toString(), gasPrice: gasPrice === null || gasPrice === void 0 ? void 0 : gasPrice.toString(), maxFeePerGas: maxFeePerGas === null || maxFeePerGas === void 0 ? void 0 : maxFeePerGas.toString(), maxPriorityFeePerGas: maxPriorityFeePerGas === null || maxPriorityFeePerGas === void 0 ? void 0 : maxPriorityFeePerGas.toString(), type, from, to, nonce: +nonce.toString() })
                }))
            },
            {
                topic: "blocks",
                messages: [
                    {
                        value: JSON.stringify({ blockHash: block.hash, blockNumber, parentHash: block.parentHash })
                    }
                ]
            }
        ]
    });
};
function listener() {
    BlockNumberEmitter_1.default.on("NEW_BLOCK", async (blockNumber) => getBlockWithTransactions(blockNumber));
}
exports.listener = listener;
//# sourceMappingURL=BlockProcessor.js.map