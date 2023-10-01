import { InfuraProvider, InfuraWebSocketProvider, JsonRpcProvider, Network, WebSocketProvider } from 'ethers';
import { configuration } from '../configurations/Configurator'

const network = Network.from(configuration.network.chainId);
const projectId = configuration.infura.projectId;

const infuraProvider = new InfuraProvider(network, projectId);

const fallbackJsonRpcProvider = new JsonRpcProvider(configuration.fallback.url, network);

export const providers = {
    rpc: {
        infuraProvider,
        fallbackJsonRpcProvider
    },
    wss: {
        infuraWebSocketProviderFactory: () => !!configuration.infura.projectId ? new InfuraWebSocketProvider(network, projectId) : null,
        fallbackWebSocketProviderFactory: () => !!configuration.fallback.wss ? new WebSocketProvider(configuration.fallback.wss, network) : null,
    }
}
