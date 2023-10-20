import joi = require('joi');
import {IValidatorConfiguration} from './interfaces';

export const validatorValidationSchema = joi
  .object<IValidatorConfiguration>()
  .keys({
    blocksThreshold: joi.number().required(),
    validatorInterval: joi.number().required(),
  });

// Path: packages/scrutinizer-fetcher/src/configuration/validator/validators.ts
