import joi = require('joi');
import {INetworkConfiguration} from './interfaces';

export const networkValidationSchema = joi
  .object<INetworkConfiguration>()
  .keys({
    chainId: joi.number().required().min(1),
    checkBlockLagIntervalMultiplier: joi.number().required().min(1).max(1000),
    blockLagThreshold: joi.number().required().min(1).max(1000),
    blockTime: joi.number().required().min(100).max(100000),
    maxProviderCount: joi.number().required().min(1).max(10),
    maxRequestTime: joi.number().required().min(100).max(5000),
    refreshProvidersInterval: joi.number().required().min(10000).max(60000),
  });

// Path: packages/scrutinizer-fetcher/src/configuration/network/interfaces.ts
