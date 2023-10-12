/* eslint-disable node/no-extraneous-import */
import {injectable} from 'inversify';
import {IRedisConfiguration} from 'scrutinizer-infrastructure/build/src/caching/redis';
import {
  IConfiguration,
  IConfigurationValidationSchema,
  IGroupConfiguration,
  IKafkaConfiguration,
  ILoggingConfiguration,
  INetworkConfiguration,
  ITopicConfiguration,
  ITopicsConfiguration,
} from './interfaces';
import joi = require('joi');

const loggingSchema = joi.object<ILoggingConfiguration>().keys({
  level: joi
    .string()
    .valid('debug', 'trace', 'info', 'warn', 'error')
    .optional(),
});

const topicConfigurationSchema = joi.object<ITopicConfiguration>().keys({
  name: joi.string().required(),
  maxBytesPerPartition: joi.number().optional(),
});

const topicsSchema = joi.object<ITopicsConfiguration>().keys({
  blocks: topicConfigurationSchema,
  blocksRetry: topicConfigurationSchema,
  blocksDlq: topicConfigurationSchema,
  blocksFull: topicConfigurationSchema,
});

const groupsSchema = joi.object<IGroupConfiguration>().keys({
  blocks: joi.string().required(),
  blocksRetry: joi.string().required(),
});

const redisSchema = joi.object<IRedisConfiguration>().keys({
  url: joi.string().required(),
});

const kafkaSchema = joi.object<IKafkaConfiguration>().keys({
  clientId: joi.string().required(),
  brokers: joi.array().required().min(1),
  topics: topicsSchema,
  groups: groupsSchema,
});

const networkSchema = joi.object<INetworkConfiguration>().keys({
  chainId: joi.number().required().min(1),
  checkBlockLagIntervalMultiplier: joi.number().required().min(1).max(1000),
  blockLagThreshold: joi.number().required().min(1).max(1000),
  blockTime: joi.number().required().min(100).max(100000),
  maxProviderCount: joi.number().required().min(1).max(10),
  maxRequestTime: joi.number().required().min(100).max(5000),
  refreshProvidersInterval: joi.number().required().min(10000).max(60000),
});

const configurationSchema = joi
  .object<IConfiguration>()
  .keys({
    logging: loggingSchema,
    kafka: kafkaSchema,
    network: networkSchema,
    redis: redisSchema,
  })
  .unknown();

@injectable()
export class ConfigurationValidationSchema
  implements IConfigurationValidationSchema
{
  validate = (configuration: IConfiguration) => {
    const validationResult = configurationSchema.validate(configuration);
    if (validationResult.error) {
      throw new Error(validationResult.error.message);
    }
  };
}
