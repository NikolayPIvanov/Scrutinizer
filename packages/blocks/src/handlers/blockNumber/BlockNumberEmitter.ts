import { EventEmitter } from "events";
import { constants } from "../constants";
import { logger } from "../../infrastructure";

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
        logger.info(`Queuing block ${job.blockNumber}`);
        this.emit(constants.events.newBlock, job)
    }
}

export const emitter = new BlockNumberEmitter();