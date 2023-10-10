import {inject, injectable} from 'inversify';
import {RedisClientType, createClient} from 'redis';
import {IConfiguration} from './configuration';
import {ILogger} from './logger';
import {TYPES} from './types';

export interface IRedisClient {
  connect(): Promise<void>;
  hScanAndGetAll: () => Promise<any>;
  hGetAll: (key: string) => Promise<any>;
  hSet: (key: string, entity: any) => Promise<number>;
}

@injectable()
export class Redis implements IRedisClient {
  private readonly client?: RedisClientType;

  constructor(
    @inject(TYPES.ILogger) private logger: ILogger,
    @inject(TYPES.IConfiguration) private configuration: IConfiguration
  ) {
    this.client = createClient({
      url: this.configuration.redis.url,
    });
    this.client.on('error', err => console.log('Redis Client Error', err));
  }

  public connect = async () => {
    if (this.client) {
      await this.client.connect();
    }
  };

  public hScanAndGetAll = async (): Promise<any> => {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }

    const results = await this.client.hScan('hashes', 0);

    return results.tuples.map(tuple => tuple.value);
  };

  public hGetAll = async (key: string): Promise<any> => {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }

    return this.client.hGetAll(key);
  };

  public hSet = async (key: string, entity: any): Promise<number> => {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }

    return this.client.hSet(key, entity);
  };
}
