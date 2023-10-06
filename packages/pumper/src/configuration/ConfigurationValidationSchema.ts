import {injectable} from 'inversify';
import {
  IConfiguration,
  IConfigurationValidationSchema,
  IKafkaConfiguration,
  ILoggingConfiguration,
  INetworkConfiguration,
  ITopicsConfiguration,
} from './interfaces';
import joi = require('joi');

const loggingSchema = joi.object<ILoggingConfiguration>().keys({
  level: joi
    .string()
    .valid('debug', 'trace', 'info', 'warn', 'error')
    .optional(),
});

const topicsSchema = joi.object<ITopicsConfiguration>().keys({
  blocks: joi.string().required(),
});

const kafkaSchema = joi.object<IKafkaConfiguration>().keys({
  clientId: joi.string().required(),
  brokers: joi.array().required().min(1),
  topics: topicsSchema,
});

const networkSchema = joi.object<INetworkConfiguration>().keys({
  chainId: joi.number().required().min(1),
});

const configurationSchema = joi
  .object<IConfiguration>()
  .keys({
    logging: loggingSchema,
    kafka: kafkaSchema,
    network: networkSchema,
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
