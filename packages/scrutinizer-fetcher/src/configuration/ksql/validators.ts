import joi = require('joi');
import {IKsqlConfiguration} from './interfaces';

export const ksqlDbValidationSchema = joi.object<IKsqlConfiguration>().keys({
  host: joi.string().required(),
  port: joi.number().required(),
});

// Path: packages/scrutinizer-fetcher/src/configuration/logging/interfaces.ts
