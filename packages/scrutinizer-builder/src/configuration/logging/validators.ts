import {ILoggingConfiguration} from './interfaces';
import joi = require('joi');

export const loggingValidationSchema = joi
  .object<ILoggingConfiguration>()
  .keys({
    level: joi
      .string()
      .valid('debug', 'trace', 'info', 'warn', 'error')
      .optional(),
  });

// Path: packages/scrutinizer-fetcher/src/configuration/network/validators.ts
