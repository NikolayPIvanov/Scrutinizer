"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configuration = void 0;
const dotenv = require("dotenv");
dotenv.config();
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";
exports.configuration = {
    infura: {
        projectId: process.env.INFURA_KEY
    },
    fallback: {
        url: process.env.FALLBACK_RPC_URL
    },
    network: {
        chainId: +process.env.CHAIN_ID
    }
};
if (!exports.configuration.network.chainId) {
    throw "Missing chain id";
}
//# sourceMappingURL=Configurator.js.map