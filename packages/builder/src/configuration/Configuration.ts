/* eslint-disable node/no-extraneous-import */
import * as dotenv from 'dotenv';
import {inject, injectable} from 'inversify';
import {IRedisConfiguration} from 'scrutinizer-infrastructure/build/src/caching/redis';
import {TYPES} from '../injection/types';
import {
  IConfiguration,
  IConfigurationValidationSchema,
  IKafkaConfiguration,
  ILoggingConfiguration,
  INetworkConfiguration,
} from './interfaces';

dotenv.config();

const DEFAULT_MAX_BYTES_PER_PARTITION = 1048576;

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
  }

  private getConfiguration = () => ({
    logging: {
      level: process.env.LOG_LEVEL!,
    },
    redis: {
      url: process.env.REDIS_URL!,
    },
    kafka: {
      clientId: process.env.KAFKA_CLIENT_ID!,
      brokers: process.env.KAFKA_BROKERS?.split(',') || [],
      topics: {
        blocks: {
          name: process.env.BLOCKS_TOPIC_NAME!,
          maxBytesPerPartition:
            +process.env.BLOCKS_TOPIC_MAX_BYTES_PER_PARTITION! ||
            DEFAULT_MAX_BYTES_PER_PARTITION,
        },
        blocksRetry: {
          name: process.env.RETRY_BLOCKS_TOPIC_NAME!,
        },
        blocksDlq: {
          name: process.env.DLQ_BLOCKS_TOPIC_NAME!,
        },
        blocksFull: {
          name: process.env.FULL_BLOCKS_TOPIC!,
          maxBytesPerPartition:
            +process.env.BLOCKS_TOPIC_MAX_BYTES_PER_PARTITION! ||
            DEFAULT_MAX_BYTES_PER_PARTITION * 10,
        },
      },
      groups: {
        blocks: process.env.BLOCKS_GROUP!,
        blocksRetry: process.env.BLOCKS_RETRY_GROUP!,
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
  });
}
