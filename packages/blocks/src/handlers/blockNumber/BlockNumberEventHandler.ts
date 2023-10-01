import { emitter } from "./BlockNumberEmitter";
import { producer } from '../../messaging/Kafka';
import { providers } from "../../providers";
import { constants } from "../constants";
import { Block } from "ethers";
import { configuration } from "../../configurations/Configurator";
import { to } from "../../utils";

const ACKNOWLEDGEMENTS = 1;

const getBlock = async (blockNumber: number) => {
    let [block, err] = await to(providers.rpc.infuraProvider.getBlock(blockNumber, true))
    if (block) return block;

    console.log(err);

    [block, err] = await to(providers.rpc.fallbackJsonRpcProvider.getBlock(blockNumber, true))
    if (block) return block;

    throw err;
}

const toTransactionMessages = (block: Block) =>
    block?.prefetchedTransactions.map((transaction) => ({ value: JSON.stringify(transaction.toJSON()) }))

const toBlockMessages = (block: Block) => {
    const { transactions, _type, ...baseBlock } = block.toJSON()

    return {
        value: JSON.stringify(baseBlock)
    };
}

const handle = async (blockNumber: number) => {
    const [block, err] = await to(getBlock(blockNumber));
    if (err || !block) {
        console.log(err);
        return;
    }

    if (!block?.prefetchedTransactions) return;

    await producer.sendBatch({
        acks: ACKNOWLEDGEMENTS,
        topicMessages: [
            {
                topic: configuration.kafka.topics.transactions,
                messages: toTransactionMessages(block)
            },
            {
                topic: configuration.kafka.topics.blocks,
                messages: [toBlockMessages(block)]
            }
        ]
    });
}

export function bootstrap() {
    emitter.on(constants.events.newBlock, async (blockNumber: number) => handle(blockNumber))
}