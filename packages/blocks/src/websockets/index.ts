import { inject, injectable } from "inversify";
import { IConfiguration, IWebSocketService, WebSocketProvider, TYPES, IBlockNumberEmitter } from "../types";

@injectable()
export class WebSocketService implements IWebSocketService {
    private wss: WebSocketProvider;
    private received: number | undefined;

    constructor(
        @inject(TYPES.IConfiguration) private configuration: IConfiguration,
        @inject(TYPES.IBlockNumberEmitter) private emitter: IBlockNumberEmitter) {
        this.wss = this.createProvider();
        this.autoReconnect();
    }

    public subscribeOnBlockEvent = () => this.wss.on('block', (blockNumber: number) => {
        this.received = Date.now();
        // this.emitter.addToQueue({ blockNumber });
    })

    private createProvider = (): WebSocketProvider => {
        return new WebSocketProvider(this.configuration.fallback.wss!, this.configuration.network.chainId)
    }

    private autoReconnect = (interval = 5000, staleTime = 20000) => {
        setInterval(async () => {
            if (!this.received) return;

            const timeSinceLastEvent = Date.now() - this.received;

            // If we have not received anything for 1 minute, 
            // either chain has stopped or provider has cut us off.
            // This is why we can force recreate.
            if (timeSinceLastEvent > staleTime) {
                await this.wss.destroy();
                this.wss = this.createProvider();
                await this.subscribeOnBlockEvent();
            }
        }, interval)
    }
}
