import {inject, injectable} from 'inversify';
import pino from 'pino';
import {IConfiguration} from '../configuration';
import {TYPES} from '../types';
import {ILogger} from './logger.interfaces';

@injectable()
export class Logger implements ILogger {
  private instance: pino.Logger;

  constructor(
    @inject(TYPES.IConfiguration) private configuration: IConfiguration
  ) {
    this.instance = pino({
      level: this.configuration.logging.level || 'info',
      timestamp: () => `,"timestamp":"${new Date(Date.now()).toISOString()}"`,
    });
  }

  public info = (...args: unknown[]) => this.instance.info(args);
  public warn = (...args: unknown[]) => this.instance.warn(args);
  public error = (...args: unknown[]) => this.instance.error(args);
}
