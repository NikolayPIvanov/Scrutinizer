import { JsonRpcProvider, Network } from 'ethers';
import emitter from "./BlockNumberEmitter";
import { configuration } from "./Configurator";
import { producer } from './Kafka';

const provider = new JsonRpcProvider(configuration.fallback.url, Network.from(configuration.network.chainId));

const getBlockWithTransactions = async (blockNumber: number) => {
    const block = await provider.getBlock(blockNumber, true);

    if (!block?.prefetchedTransactions) return;

    await producer.sendBatch({
        acks: 1,
        topicMessages: [
            {
                topic: "transactions",
                messages: block?.prefetchedTransactions.map(({ blockHash, blockNumber, chainId, value, hash, data, gasLimit, gasPrice, maxFeePerGas, maxPriorityFeePerGas, type, from, to, nonce }) => ({
                    value: JSON.stringify({ blockHash, blockNumber, chainId: +chainId?.toString() || configuration.network.chainId, data, value: value?.toString(), hash, gasLimit: +gasLimit.toString(), gasPrice: gasPrice?.toString(), maxFeePerGas: maxFeePerGas?.toString(), maxPriorityFeePerGas: maxPriorityFeePerGas?.toString(), type, from, to, nonce: +nonce.toString() })
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
}

export function listener() {
    emitter.on("NEW_BLOCK", async (blockNumber: number) => getBlockWithTransactions(blockNumber))
}