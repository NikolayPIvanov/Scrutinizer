import { EventEmitter } from "events";
import { constants } from "../constants";

export interface IBlockJob {
    blockNumber: number,
    retries?: number | undefined,
    callback?: () => void
}

class BlockNumberEmitter extends EventEmitter {
    lastQueuedBlockNumber = 0;

    constructor() {
        super();
    }

    addToQueue(job: IBlockJob) {
        console.log(`Queuing block ${job.blockNumber}`);

        if (job.blockNumber <= this.lastQueuedBlockNumber) {
            console.log(`Check ${job.blockNumber} as we see it for second or more time.`)
        }
        this.lastQueuedBlockNumber = Math.max(job.blockNumber, this.lastQueuedBlockNumber);


        this.emit(constants.events.newBlock, job)
    }
}

export const emitter = new BlockNumberEmitter();