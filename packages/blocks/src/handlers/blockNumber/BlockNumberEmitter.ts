import { EventEmitter } from "events";
import { constants } from "../constants";

class BlockNumberEmitter extends EventEmitter {
    constructor() {
        super();
    }

    addToQueue(blockNumber: number) {
        this.emit(constants.events.newBlock, blockNumber)
    }
}

export const emitter = new BlockNumberEmitter();