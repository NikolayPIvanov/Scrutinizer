import { IBlockJob, emitter } from "./BlockNumberEmitter";
import { producer } from '../../messaging/Kafka';
import { providers } from "../../providers";
import { constants } from "../constants";
import { Block, TransactionResponse } from "ethers";
import { configuration } from "../../configurations/Configurator";
import { to } from "../../utils";
import { logger } from "../../infrastructure";
import { splitByBytes } from "../../utils/splitByBytesSize";

const ACKNOWLEDGEMENTS = 1;
const THRESHOLD_BLOCKS = 200;

const rpcProvider = !!configuration.infura.projectId ? providers.rpc.infuraProvider : providers.rpc.fallbackJsonRpcProvider;

const getBlock = async (blockNumber: number) => {
    let [block, err] = await to(rpcProvider.getBlock(blockNumber, true))
    if (block) return block;

    throw err;
}

const toTransactionMessages = (block: Block) => {
    const splits = splitByBytes<TransactionResponse>(block?.prefetchedTransactions);
    return splits.map((split) => {
        const messages = split.rows.map(r => ({ value: JSON.stringify(r.toJSON()) }));

        return {
            messages,
            topic: configuration.kafka.topics.transactions
        }
    })
}

const toBlockMessages = (block: Block) => {
    const { transactions, _type, ...baseBlock } = block.toJSON()

    return {
        value: JSON.stringify(baseBlock)
    };
}

const blocksCache = new Map<number, Block>();

const addToCache = async (block: Block) => {
    const cachedBlock = blocksCache.get(block.number);
    if (cachedBlock) {
        logger.warn(`Duplicate for ${block.number}, old was ${cachedBlock.hash}, now is ${block.hash}`);

        await producer.sendBatch({
            acks: ACKNOWLEDGEMENTS,
            topicMessages: [
                {
                    topic: configuration.kafka.topics.duplicateBlocks,
                    messages: [toBlockMessages(cachedBlock)]
                }
            ]
        });
    }

    blocksCache.set(block.number, block);
}

const evictCache = (block: Block) => {
    blocksCache.delete(block.number - THRESHOLD_BLOCKS);
}

const sendBlockForRetry = async (job: IBlockJob) => {
    const { blockNumber, retries, callback } = job;

    const [, error] = await to(producer.sendBatch({
        acks: ACKNOWLEDGEMENTS,
        topicMessages: [
            {
                topic: configuration.kafka.topics.blocksNumberRetry,
                messages: [{
                    value: JSON.stringify({ blockNumber, retries })
                }]
            }
        ]
    }));

    if (error) {
        logger.error("Failed to send block for retry!");

        throw error;
    }

    if (callback) callback();
}

const handle = async (job: IBlockJob) => {
    const { blockNumber, callback } = job;
    const [block, error] = await to(getBlock(blockNumber));
    if (error || !block) return sendBlockForRetry(job);

    if (!block?.prefetchedTransactions) {
        if (callback) {
            callback();
        }

        return;
    }

    const transactionTopicMessagesSet = toTransactionMessages(block);

    const [, err] = await to(producer.sendBatch({
        acks: ACKNOWLEDGEMENTS,
        topicMessages: [
            ...transactionTopicMessagesSet,
            {
                topic: configuration.kafka.topics.blocks,
                messages: [toBlockMessages(block)]
            }
        ]
    }));

    await addToCache(block);
    evictCache(block);

    if (err) {
        await sendBlockForRetry(job);
    }

}

export function bootstrap() {
    emitter.on(constants.events.newBlock,
        async ({ blockNumber, retries = 0, callback }: IBlockJob) => handle({ blockNumber, retries, callback }))
}