import pino from "pino";
import { ILogger, TYPES, IConfiguration } from "../../types";
import { inject, injectable } from "inversify";

@injectable()
export class Logger implements ILogger {
    private instance: pino.Logger;

    constructor(@inject(TYPES.IConfiguration) private configuration: IConfiguration) {
        this.instance = pino({
            // level: this.configuration.logging.level || 'info',
            timestamp: () => `,"timestamp":"${new Date(Date.now()).toISOString()}"`,
        })
    }

    public info = (...args: any[]) => this.instance.info(args);
    public warn = (...args: any[]) => this.instance.info(args);
    public error = (...args: any[]) => this.instance.info(args);
}