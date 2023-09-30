/// <reference types="node" />
import { EventEmitter } from "events";
declare class BlockNumberEmitter extends EventEmitter {
    constructor();
    process(blockNumber: number): void;
}
declare const blockNumberEmitter: BlockNumberEmitter;
export default blockNumberEmitter;
