"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
class BlockNumberEmitter extends events_1.EventEmitter {
    constructor() {
        super();
    }
    process(blockNumber) {
        this.emit("NEW_BLOCK", blockNumber);
    }
}
const blockNumberEmitter = new BlockNumberEmitter();
exports.default = blockNumberEmitter;
//# sourceMappingURL=BlockNumberEmitter.js.map