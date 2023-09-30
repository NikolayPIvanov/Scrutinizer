import * as dotenv from 'dotenv'; 

dotenv.config();

process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

export const configuration = {
    infura: {
        projectId: process.env.INFURA_KEY
    },
    fallback: {
        url: process.env.FALLBACK_RPC_URL
    },
    network: {
        chainId: +process.env.CHAIN_ID!
    }
}

if(!configuration.network.chainId) {
    throw "Missing chain id"
}