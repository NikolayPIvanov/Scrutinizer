import { EventEmitter } from "events";
import { constants } from "../constants";

export interface IBlockJob {
    blockNumber: number,
    retries?: number | undefined,
    callback?: () => void
}

class BlockNumberEmitter extends EventEmitter {
    constructor() {
        super();
    }

    addToQueue(job: IBlockJob) {
        console.log(`Queuing block ${job.blockNumber}`);
        this.emit(constants.events.newBlock, job)
    }
}

export const emitter = new BlockNumberEmitter();