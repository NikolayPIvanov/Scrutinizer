import joi = require('joi');
import {
  IKafkaConfiguration,
  ITopicConfiguration,
  ITopicsConfiguration,
} from './interfaces';

const topicSchema = joi.object<ITopicConfiguration>().keys({
  name: joi.string().required(),
  maxBytesPerPartition: joi.number().optional(),
});

const topicsSchema = joi.object<ITopicsConfiguration>().keys({
  blockNumbers: topicSchema,
  forked: topicSchema,
  confirmed: topicSchema,
});

export const kafkaValidationSchema = joi.object<IKafkaConfiguration>().keys({
  clientId: joi.string().required(),
  brokers: joi.array().required().min(1),
  topics: topicsSchema,
});
