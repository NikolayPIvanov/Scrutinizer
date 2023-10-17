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
  IValidatorConfiguration,
} from './configuration.interfaces';

dotenv.config();

@injectable()
export class Configuration implements IConfiguration {
  logging: ILoggingConfiguration;
  kafka: IKafkaConfiguration;
  network: INetworkConfiguration;
  ksql: IKsqlConfiguration;
  validator: IValidatorConfiguration;

  constructor(
    @inject(TYPES.IConfigurationValidationSchema)
    private configurationValidationSchema: IConfigurationValidationSchema
  ) {
    const configuration = this.getConfiguration();
    this.configurationValidationSchema.validate(configuration);

    this.logging = configuration.logging;
    this.kafka = configuration.kafka;
    this.network = configuration.network;
    this.ksql = configuration.ksql;
    this.validator = configuration.validator;
  }

  private getConfiguration = () => ({
    validator: {
      blocksThreshold: +process.env.VALIDATOR_BLOCKS_THRESHOLD!,
      validatorInterval: +process.env.VALIDATOR_INTERVAL!,
    },
    logging: {
      level: process.env.LOG_LEVEL!,
    },
    kafka: {
      clientId: process.env.KAFKA_CLIENT_ID!,
      brokers: process.env.KAFKA_BROKERS?.split(',') || [],
      topics: {
        blockNumbers: {
          name: process.env.BLOCKS_TOPIC_NAME!,
          maxBytesPerPartition:
            +process.env.BLOCKS_TOPIC_MAX_BYTES_PER_PARTITION! || 1048576,
        },
        forked: {
          name: process.env.FORKED_BLOCKS_TOPIC_NAME!,
          maxBytesPerPartition:
            +process.env.FORKED_BLOCKS_TOPIC_MAX_BYTES_PER_PARTITION! ||
            1048576,
        },
        confirmed: {
          name: process.env.CONFIRMED_BLOCKS_TOPIC_NAME!,
          maxBytesPerPartition:
            +process.env.CONFIRMED_BLOCKS_TOPIC_MAX_BYTES_PER_PARTITION! ||
            1048576,
        },
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
    ksql: {
      host: process.env.KSQL_HOST || 'http://localhost',
      port: +(process.env.KSQL_PORT || 8088),
    },
  });
}
