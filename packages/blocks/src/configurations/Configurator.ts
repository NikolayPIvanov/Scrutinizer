import * as dotenv from 'dotenv';

dotenv.config();

export const configuration = {
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
            blocks: process.env.BLOCKS_GROUP!,
            blockNumberRetry: process.env.BLOCKS_NUMBER_RETRY_GROUP!
        }
    },
    infura: {
        projectId: process.env.INFURA_KEY,
        baseUrl: process.env.BASE_INFURA_URL || "https://mainnet.infura.io/v3/"
    },
    fallback: {
        url: process.env.FALLBACK_RPC_URL,
        wss: process.env.FALLBACK_WSS_URL
    },
    network: {
        chainId: +process.env.CHAIN_ID!
    }
}

if (!configuration.network.chainId) {
    throw "Missing chain id"
}

if (!configuration.kafka.brokers?.length) {
    throw "Missing Kafka Brokers"
}

if (!configuration.kafka.clientId) {
    throw "Missing Kafka Client ID"
}


