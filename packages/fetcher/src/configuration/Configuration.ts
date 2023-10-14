import * as dotenv from 'dotenv';
import {inject, injectable} from 'inversify';
import {TYPES} from '../injection/types';
import {
  IConfiguration,
  IConfigurationValidationSchema,
  IKafkaConfiguration,
  IKsqlConfiguration,
  ILoggingConfiguration,
  INetworkConfiguration,
  IRedisConfiguration,
} from './configuration.interfaces';

dotenv.config();

@injectable()
export class Configuration implements IConfiguration {
  logging: ILoggingConfiguration;
  kafka: IKafkaConfiguration;
  network: INetworkConfiguration;
  redis: IRedisConfiguration;

  constructor(
    @inject(TYPES.IConfigurationValidationSchema)
    private configurationValidationSchema: IConfigurationValidationSchema
  ) {
    const configuration = this.getConfiguration();
    this.configurationValidationSchema.validate(configuration);

    this.logging = configuration.logging;
    this.kafka = configuration.kafka;
    this.network = configuration.network;
    this.redis = configuration.redis;
    this.ksql = configuration.ksql;
  }
  ksql: IKsqlConfiguration;

  private getConfiguration = () => ({
    logging: {
      level: process.env.LOG_LEVEL!,
    },
    kafka: {
      clientId: process.env.KAFKA_CLIENT_ID!,
      brokers: process.env.KAFKA_BROKERS?.split(',') || [],
      topics: {
        blocks: process.env.BLOCKS_TOPIC!,
        forks: process.env.FORKED_BLOCKS_TOPIC!,
        confirmed: process.env.CONFIRMED_BLOCKS_TOPIC!,
        fullBlock: process.env.FULL_BLOCKS_TOPIC!,
        fullBlockRetry: process.env.FULL_RETRY_BLOCKS_TOPIC!,
        fullBlockDlq: process.env.FULL_DLQ_BLOCKS_TOPIC!,
      },
      groups: {
        fullBlock: process.env.FULL_BLOCKS_TOPIC_CONSUMER_GROUP!,
        retryFullBlock: process.env.FULL_RETRY_BLOCKS_TOPIC_CONSUMER_GROUP!,
      },
    },
    network: {
      chainId: +process.env.CHAIN_ID!,
      checkBlockLagIntervalMultiplier:
        +process.env.CHECK_BLOCK_LAG_INTERVAL_MULTIPLIER!,
      blockLagThreshold: +process.env.BLOCK_LAG_THRESHOLD!,
      blockTime: +process.env.BLOCK_TIME!,
      maxProviderCount: +process.env.MAX_PROVIDER_COUNT!,
      maxRequestTime: +process.env.MAX_REQUEST_TIME!,
      refreshProvidersInterval: +process.env.REFRESH_PROVIDERS_INTERVAL!,
    },
    redis: {
      url: process.env.REDIS_URL!,
    },
    ksql: {
      host: process.env.KSQL_HOST || 'http://localhost',
      port: +(process.env.KSQL_PORT || 8088),
    },
  });
}
