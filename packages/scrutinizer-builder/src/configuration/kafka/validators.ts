import joi = require('joi');
import {
  IGroupConfiguration,
  IKafkaConfiguration,
  ITopicConfiguration,
  ITopicsConfiguration,
} from './interfaces';

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

export const kafkaValidationSchema = joi.object<IKafkaConfiguration>().keys({
  clientId: joi.string().required(),
  brokers: joi.array().required().min(1),
  topics: topicsSchema,
  groups: groupsSchema,
});

// Path: packages/scrutinizer-fetcher/src/configuration/kafka/validators.ts
