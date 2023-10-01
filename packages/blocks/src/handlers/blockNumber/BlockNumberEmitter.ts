import { EventEmitter } from "events";
import { constants } from "../constants";

class BlockNumberEmitter extends EventEmitter {
    constructor() {
        super();
    }

    addToQueue(blockNumber: number) {
        console.log(`Queuing ${blockNumber}`)
        this.emit(constants.events.newBlock, blockNumber)
    }
}

export const emitter = new BlockNumberEmitter();