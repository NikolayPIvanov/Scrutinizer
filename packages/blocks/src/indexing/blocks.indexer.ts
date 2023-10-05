// import { configuration } from "../configurations/configuration";
// import { emitter } from "../handlers/blockNumber/BlockNumberEmitter";
// import { providers } from "../providers";

// export const indexMissingBlocksFrom = async (lastProcessedNumber: number) => {
//     if (!lastProcessedNumber) {
//         return;
//     }

//     const rpcProvider = !!configuration.infura.projectId ? providers.rpc.infuraProvider : providers.rpc.fallbackJsonRpcProvider;
//     const latestBlockNumber = await rpcProvider.getBlockNumber();

//     for (let index = lastProcessedNumber + 1; index <= latestBlockNumber; index++) {
//         emitter.addToQueue({ blockNumber: index })
//     }
// }
