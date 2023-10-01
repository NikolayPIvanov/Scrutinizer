import joi = require("joi");

const loggingSchema = joi
    .object()
    .keys({
        level: joi.string().valid("debug", "trace", "info", "warn", "error").optional()
    });

const topicsSchema = joi.object().keys({
    blocks: joi.string().required(),
    duplicateBlocks: joi.string().required(),
    blocksNumberRetry: joi.string().required(),
    transactions: joi.string().required(),
    receipts: joi.string().required(),
});

const groupsSchema = joi.object().keys({
    transactions: joi.string().required(),
    blockNumberRetry: joi.string().required(),
});

const kafkaSchema = joi
    .object()
    .keys({
        clientId: joi.string().required(),
        brokers: joi.array().required().min(1),
        topics: topicsSchema,
        groups: groupsSchema,
    });

const infuraSchema = joi
    .object()
    .keys({
        projectId: joi.string().optional(),
        baseUrl: joi.string().optional(),
    })

const fallbackSchema = joi
    .object()
    .keys({
        url: joi.string().optional(),
        wss: joi.string().optional(),
    })

const networkSchema = joi
    .object()
    .keys({
        chainId: joi.number().required().min(1),
    })

export const configurationSchema = joi
    .object()
    .keys({
        logging: loggingSchema,
        kafka: kafkaSchema,
        infura: infuraSchema,
        fallback: fallbackSchema,
        network: networkSchema
    })
    .unknown();