import { EventEmitter } from "events";

class BlockNumberEmitter extends EventEmitter {
    constructor() {
        super();
    }

    process(blockNumber: number) {
        this.emit("NEW_BLOCK", blockNumber)
    }
}

const blockNumberEmitter = new BlockNumberEmitter();

export default blockNumberEmitter;