import { Kafka } from 'kafkajs';
import { configuration } from '../configurations/Configurator';

export const kafka = new Kafka({
    clientId: configuration.kafka.clientId,
    brokers: configuration.kafka.brokers,
});

export const admin = kafka.admin()

export const producer = kafka.producer()

export const bootstrap = async () => {
    await producer.connect();
}

export const bootstrapAdmin = async () => {
    await admin.connect()
}