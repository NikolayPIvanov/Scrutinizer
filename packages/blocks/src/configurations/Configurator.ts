import * as dotenv from 'dotenv';
import joi = require("joi");
import { configurationSchema } from "./configuration.validation";

dotenv.config();


export const configuration = {
    logging: {
        level: process.env.LOG_LEVEL
    },
    kafka: {
        clientId: process.env.KAFKA_CLIENT_ID,
        brokers: process.env.KAFKA_BROKERS?.split(",") || [],
        topics: {
            blocks: process.env.BLOCKS_TOPIC!,
            duplicateBlocks: process.env.DUPLICATE_BLOCKS_TOPIC!,
            blocksNumberRetry: process.env.BLOCKS_NUMBER_RETRY!,
            transactions: process.env.TRANSACTIONS_TOPIC!,
            receipts: process.env.RECEIPTS_TOPIC!,
        },
        groups: {
            transactions: process.env.TRANSACTIONS_GROUP!,
            blockNumberRetry: process.env.BLOCKS_NUMBER_RETRY_GROUP!
        }
    },
    infura: {
        projectId: process.env.INFURA_KEY,
        baseUrl: process.env.BASE_INFURA_URL
    },
    fallback: {
        url: process.env.FALLBACK_RPC_URL,
        wss: process.env.FALLBACK_WSS_URL
    },
    network: {
        chainId: +process.env.CHAIN_ID!
    }
}

const validationResult = configurationSchema.validate(configuration);
if (validationResult.error) {
    throw validationResult.error.message;
}