import { injectable } from "inversify";
import { IEmitter } from "../../types";
import EventEmitter = require("events");

@injectable()
export class Emitter implements IEmitter {
    instance: EventEmitter;

    constructor() {
        this.instance = new EventEmitter();
    }
}