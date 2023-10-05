import joi = require("joi");
import { IConfiguration, IFallbackConfiguration, IGroupConfiguration, IInfuraConfiguration, IKafkaConfiguration, ILoggingConfiguration, INetworkConfiguration, ITopicsConfiguration } from "../types";

const loggingSchema = joi
    .object<ILoggingConfiguration>()
    .keys({
        level: joi.string().valid("debug", "trace", "info", "warn", "error").optional()
    });

const topicsSchema = joi.object<ITopicsConfiguration>().keys({
    blocks: joi.string().required(),
    duplicateBlocks: joi.string().required(),
    blocksNumberRetry: joi.string().required(),
    transactions: joi.string().required(),
    receipts: joi.string().required(),
});

const groupsSchema = joi.object<IGroupConfiguration>().keys({
    transactions: joi.string().required(),
    blockNumberRetry: joi.string().required(),
});

const kafkaSchema = joi
    .object<IKafkaConfiguration>()
    .keys({
        clientId: joi.string().required(),
        brokers: joi.array().required().min(1),
        topics: topicsSchema,
        groups: groupsSchema,
    });

const infuraSchema = joi
    .object<IInfuraConfiguration>()
    .keys({
        projectId: joi.string().optional(),
        baseUrl: joi.string().optional(),
    })

const fallbackSchema = joi
    .object<IFallbackConfiguration>()
    .keys({
        url: joi.string().optional(),
        wss: joi.string().optional(),
    })

const networkSchema = joi
    .object<INetworkConfiguration>()
    .keys({
        chainId: joi.number().required().min(1),
    })

export const configurationSchema = joi
    .object<IConfiguration>()
    .keys({
        logging: loggingSchema,
        kafka: kafkaSchema,
        infura: infuraSchema,
        fallback: fallbackSchema,
        network: networkSchema
    })
    .unknown();