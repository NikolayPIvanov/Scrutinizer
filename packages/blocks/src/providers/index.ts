import { InfuraProvider, InfuraWebSocketProvider, JsonRpcProvider, Network, WebSocketProvider } from 'ethers';
import { configuration } from '../configurations/Configurator'

const network = Network.from(configuration.network.chainId);
const projectId = configuration.infura.projectId;

const infuraProvider = new InfuraProvider(network, projectId);
const infuraWebSocketProvider = new InfuraWebSocketProvider(network, projectId);

const fallbackJsonRpcProvider = new JsonRpcProvider(configuration.fallback.url, network);

export const providers = {
    rpc: {
        infuraProvider,
        fallbackJsonRpcProvider
    },
    wss: {
        infuraWebSocketProvider,
        fallbackWebSocketProvider: !!configuration.fallback.wss ? new WebSocketProvider(configuration.fallback.wss, network) : null
    }
}
