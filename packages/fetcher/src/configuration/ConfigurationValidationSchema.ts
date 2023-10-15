import {injectable} from 'inversify';
import {
  IConfiguration,
  IConfigurationValidationSchema,
  IKafkaConfiguration,
  IKsqlConfiguration,
  ILoggingConfiguration,
  INetworkConfiguration,
  ITopicConfiguration,
  ITopicsConfiguration,
  IValidatorConfiguration,
} from './configuration.interfaces';
import joi = require('joi');

const loggingSchema = joi.object<ILoggingConfiguration>().keys({
  level: joi
    .string()
    .valid('debug', 'trace', 'info', 'warn', 'error')
    .optional(),
});

const topicSchema = joi.object<ITopicConfiguration>().keys({
  name: joi.string().required(),
  maxBytesPerPartition: joi.number().optional(),
});

const topicsSchema = joi.object<ITopicsConfiguration>().keys({
  blockNumbers: topicSchema,
  forked: topicSchema,
  confirmed: topicSchema,
});

const ksqlDbSchema = joi.object<IKsqlConfiguration>().keys({
  host: joi.string().required(),
  port: joi.number().required(),
});

const validatorSchema = joi.object<IValidatorConfiguration>().keys({
  blocksThreshold: joi.number().required(),
  validatorInterval: joi.number().required(),
});

const kafkaSchema = joi.object<IKafkaConfiguration>().keys({
  clientId: joi.string().required(),
  brokers: joi.array().required().min(1),
  topics: topicsSchema,
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
    ksql: ksqlDbSchema,
    validator: validatorSchema,
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
