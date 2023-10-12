import {injectable} from 'inversify';
import {RedisClientType, createClient} from 'redis';
import {IRedisClient, IRedisConfiguration} from './redis.interfaces';

@injectable()
export class Redis implements IRedisClient {
  private readonly client: RedisClientType;

  constructor(configuration: IRedisConfiguration) {
    this.client = createClient({
      url: configuration.url,
    });
  }

  public del = async (keys: string[]) => {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }

    await this.client.del(keys);
  };

  public connect = async () => {
    if (this.client) {
      await this.client.connect();
    }
  };

  public hScanAndGetAll = async <T>(): Promise<T[]> => {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }

    const results = await this.client.hScan('hashes', 0);

    return results.tuples.map(tuple => JSON.parse(tuple.value) as T);
  };

  public hGetAll = async <T>(key: string): Promise<T> => {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }

    const record = await this.client.hGetAll(key);

    return record as T;
  };

  public hSet = async (key: string, entity: any): Promise<number> => {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }

    return this.client.hSet(key, entity);
  };
}
