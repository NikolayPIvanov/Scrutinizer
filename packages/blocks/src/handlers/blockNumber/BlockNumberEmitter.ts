import { EventEmitter } from "events";
import { constants } from "../constants";
import { IBlockJob, IBlockNumberEmitter, IEmitter, TYPES } from "../../types";
import { inject, injectable } from "inversify";

@injectable()
export class BlockNumberEmitter implements IBlockNumberEmitter {
    constructor(@inject(TYPES.IEmitter) private emitter: IEmitter) {
    }

    addToQueue(job: IBlockJob) {
        this.emitter.instance.emit(constants.events.newBlock, job);
    }
}