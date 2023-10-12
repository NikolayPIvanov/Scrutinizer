export interface IRedisClient {
  connect(): Promise<void>;
  hScanAndGetAll: <T>() => Promise<T[]>;
  hGetAll: <T>(key: string) => Promise<T>;
  hSet: (key: string, entity: any) => Promise<number>;
  del: (keys: string[]) => Promise<void>;
}

export interface IRedisConfiguration {
  url: string;
}
