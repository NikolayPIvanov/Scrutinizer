import { Kafka } from 'kafkajs';

export const kafka = new Kafka({
    clientId: 'scrutinizer',
    brokers: ['localhost:8097', 'localhost:8098', 'localhost:8099'],
});

export const producer = kafka.producer()

export const initialize = async () => {
    await producer.connect();
}

