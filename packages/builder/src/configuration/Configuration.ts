import * as dotenv from 'dotenv';
import {inject, injectable} from 'inversify';
import {TYPES} from '../types';
import {
  IConfiguration,
  IConfigurationValidationSchema,
  IKafkaConfiguration,
  ILoggingConfiguration,
  INetworkConfiguration,
} from './interfaces';

dotenv.config();

@injectable()
export class Configuration implements IConfiguration {
  logging: ILoggingConfiguration;
  kafka: IKafkaConfiguration;
  network: INetworkConfiguration;

  constructor(
    @inject(TYPES.IConfigurationValidationSchema)
    private configurationValidationSchema: IConfigurationValidationSchema
  ) {
    const configuration = this.getConfiguration();
    this.configurationValidationSchema.validate(configuration);

    this.logging = configuration.logging;
    this.kafka = configuration.kafka;
    this.network = configuration.network;
  }

  private getConfiguration = () => ({
    logging: {
      level: process.env.LOG_LEVEL!,
    },
    kafka: {
      clientId: process.env.KAFKA_CLIENT_ID!,
      brokers: process.env.KAFKA_BROKERS?.split(',') || [],
      topics: {
        blocks: process.env.BLOCKS_TOPIC!,
      },
      groups: {
        blocks: process.env.BLOCKS_GROUP!,
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
