import { IBlockJob, emitter } from "./BlockNumberEmitter";
import { producer } from '../../messaging/Kafka';
import { providers } from "../../providers";
import { constants } from "../constants";
import { Block } from "ethers";
import { configuration } from "../../configurations/Configurator";
import { to } from "../../utils";
import { logger } from "../../infrastructure";

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

const THRESHOLD_BLOCKS = 200;
const evictCache = (block: Block) => {
    blocksCache.delete(block.number - THRESHOLD_BLOCKS);
}

const handle = async (job: IBlockJob) => {
    const { blockNumber, retries, callback } = job;
    const [block, err] = await to(getBlock(blockNumber));
    if (err || !block) {
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

    addToCache(block);
    evictCache(block);

    if (callback) callback();
}

export function bootstrap() {
    emitter.on(constants.events.newBlock,
        async ({ blockNumber, retries = 0, callback }: IBlockJob) => handle({ blockNumber, retries, callback }))
}