import { IBlockJob, emitter } from "./BlockNumberEmitter";
import { producer } from '../../messaging/Kafka';
import { providers } from "../../providers";
import { constants } from "../constants";
import { Block } from "ethers";
import { configuration } from "../../configurations/Configurator";
import { to } from "../../utils";

const ACKNOWLEDGEMENTS = 1;

const rpcProvider = !!configuration.infura.projectId ? providers.rpc.infuraProvider : providers.rpc.fallbackJsonRpcProvider;

const getBlock = async (blockNumber: number) => {
    let [block, err] = await to(rpcProvider.getBlock(blockNumber, true))
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

const handle = async (job: IBlockJob) => {
    const { blockNumber, retries, callback } = job;
    const [block, err] = await to(getBlock(blockNumber));
    if (err || !block) {
        console.log(`Block ${blockNumber} was not found`, err);

        await producer.sendBatch({
            acks: ACKNOWLEDGEMENTS,
            topicMessages: [
                {
                    topic: configuration.kafka.topics.blocksNumberRetry,
                    messages: [{
                        value: JSON.stringify({ blockNumber, retries })
                    }]
                }
            ]
        });

        if (callback) callback();

        return;
    }

    if (!block?.prefetchedTransactions) {
        if (callback) callback();
    }

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

    if (callback) callback();
}

export function bootstrap() {
    emitter.on(constants.events.newBlock,
        async ({ blockNumber, retries = 0, callback }: IBlockJob) => handle({ blockNumber, retries, callback }))
}