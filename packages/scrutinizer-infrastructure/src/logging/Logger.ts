import {injectable} from 'inversify';
import pino from 'pino';
import {ILogger, ILoggerConfiguration} from './logger.interfaces';

@injectable()
export class Logger implements ILogger {
  private _logger: pino.Logger;

  constructor(configuration: ILoggerConfiguration) {
    this._logger = pino({
      level: configuration.level || 'info',
      timestamp: () => `,"timestamp":"${new Date(Date.now()).toISOString()}"`,
    });
  }

  public info = (...args: unknown[]) => this._logger.info(args);
  public warn = (...args: unknown[]) => this._logger.warn(args);
  public error = (...args: unknown[]) => this._logger.error(args);
}
