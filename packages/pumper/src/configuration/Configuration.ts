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
    },
    network: {
      chainId: +process.env.CHAIN_ID!,
    },
  });
}
