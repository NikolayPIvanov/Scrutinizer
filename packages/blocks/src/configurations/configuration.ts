import * as dotenv from 'dotenv';
import {injectable} from 'inversify';
import 'reflect-metadata';
import {
  IConfiguration,
  IFallbackConfiguration,
  IInfuraConfiguration,
  IKafkaConfiguration,
  ILoggingConfiguration,
  INetworkConfiguration,
} from '../types';
import {configurationSchema} from './configuration.validation';

dotenv.config();

@injectable()
export class Configuration implements IConfiguration {
  logging: ILoggingConfiguration;
  kafka: IKafkaConfiguration;
  infura: IInfuraConfiguration;
  fallback: IFallbackConfiguration;
  network: INetworkConfiguration;

  constructor() {
    this.logging = {
      level: process.env.LOG_LEVEL!,
    };

    this.kafka = {
      clientId: process.env.KAFKA_CLIENT_ID!,
      brokers: process.env.KAFKA_BROKERS?.split(',') || [],
      topics: {
        blocks: process.env.BLOCKS_TOPIC!,
        duplicateBlocks: process.env.DUPLICATE_BLOCKS_TOPIC!,
        blocksNumberRetry: process.env.BLOCKS_NUMBER_RETRY!,
        transactions: process.env.TRANSACTIONS_TOPIC!,
        receipts: process.env.RECEIPTS_TOPIC!,
      },
      groups: {
        transactions: process.env.TRANSACTIONS_GROUP!,
        blockNumberRetry: process.env.BLOCKS_NUMBER_RETRY_GROUP!,
      },
    };

    this.infura = {
      projectId: process.env.INFURA_KEY,
      baseUrl: process.env.BASE_INFURA_URL,
    };

    this.fallback = {
      url: process.env.FALLBACK_RPC_URL,
      wss: process.env.FALLBACK_WSS_URL,
    };

    this.network = {
      chainId: +process.env.CHAIN_ID!,
    };

    this.validate();
  }

  private validate = () => {
    const validationResult = configurationSchema.validate(this);
    if (validationResult.error) {
      throw validationResult.error.message;
    }
  };
}
