import { configuration } from "../configurations/Configurator";
import { emitter } from "../handlers/blockNumber/BlockNumberEmitter";
import { providers } from "../providers";

let received: number | undefined;

const createProvider = () => {
    const wssProviderFactory = !!configuration.infura.projectId ?
        providers.wss.infuraWebSocketProviderFactory :
        providers.wss.fallbackWebSocketProviderFactory;

    if (!wssProviderFactory) throw "No WSS Provider configured!";

    const provider = wssProviderFactory();
    if (!provider) throw "Could not create WSS Provider!";

    return provider;
}

export const websocket = {
    provider: createProvider()
}

export const subscribeOnBlockEvent = () => websocket.provider.on('block', (blockNumber: number) => {
    received = Date.now();
    emitter.addToQueue({ blockNumber });
})

setInterval(async () => {
    if (!received) return;

    const timeSinceLastEvent = Date.now() - received;

    // If we have not received anything for 1 minute, 
    // either chain has stopped or provider has cut us off.
    // This is why we can force recreate.
    if (timeSinceLastEvent > 20000) {
        await websocket.provider.destroy();
        websocket.provider = createProvider();
        await subscribeOnBlockEvent();
    }
}, 5000);