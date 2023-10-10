import pino from 'pino';

export interface ILogger {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export interface ILoggerConfiguration {
  level?: string;
}

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
