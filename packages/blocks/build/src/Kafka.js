"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initialize = exports.producer = exports.kafka = void 0;
const kafkajs_1 = require("kafkajs");
exports.kafka = new kafkajs_1.Kafka({
    clientId: 'scrutinizer',
    brokers: ['localhost:8097', 'localhost:8098', 'localhost:8099'],
});
exports.producer = exports.kafka.producer();
const initialize = async () => {
    await exports.producer.connect();
};
exports.initialize = initialize;
//# sourceMappingURL=Kafka.js.map