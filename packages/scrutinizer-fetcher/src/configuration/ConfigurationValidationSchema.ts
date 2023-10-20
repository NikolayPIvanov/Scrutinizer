import {injectable} from 'inversify';
import {IConfiguration, IConfigurationValidationSchema} from './interfaces';
import {kafkaValidationSchema} from './kafka';
import {ksqlDbValidationSchema} from './ksql';
import {loggingValidationSchema} from './logging';
import {networkValidationSchema} from './network';
import {validatorValidationSchema} from './validator';
import joi = require('joi');

@injectable()
export class ConfigurationValidationSchema
  implements IConfigurationValidationSchema
{
  validate = (configuration: IConfiguration) => {
    const schema = joi
      .object<IConfiguration>()
      .keys({
        logging: loggingValidationSchema,
        kafka: kafkaValidationSchema,
        network: networkValidationSchema,
        ksql: ksqlDbValidationSchema,
        validator: validatorValidationSchema,
      })
      .unknown();

    const validationResult = schema.validate(configuration);
    if (validationResult.error) {
      throw new Error(validationResult.error.message);
    }
  };
}
