import {injectable} from 'inversify';
import pino from 'pino';
import {ILogger, ILoggerConfiguration} from './logger.interfaces';

@injectable()
export class Logger implements ILogger {
  private logger: pino.Logger;

  constructor(configuration: ILoggerConfiguration) {
    this.logger = pino({
      level: configuration.level || 'info',
      timestamp: () => `,"timestamp":"${new Date(Date.now()).toISOString()}"`,
    });
  }

  public info = (...args: unknown[]) => this.logger.info(args);
  public warn = (...args: unknown[]) => this.logger.warn(args);
  public error = (...args: unknown[]) => this.logger.error(args);
}
