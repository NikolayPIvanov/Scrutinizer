import { inject, injectable } from 'inversify';
import { Admin, Kafka, Producer } from 'kafkajs';
import { TYPES, IConfiguration, IKafkaClient } from '../types';

@injectable()
export class KafkaClient implements IKafkaClient {
    private readonly kafka: Kafka;
    private readonly admin: Admin;
    public readonly producer: Producer;

    constructor(
        @inject(TYPES.IConfiguration) private configuration: IConfiguration
    ) {
        this.kafka = new Kafka({
            clientId: this.configuration.kafka.clientId,
            brokers: this.configuration.kafka.brokers,
        })

        this.admin = this.kafka.admin();
        this.producer = this.kafka.producer();
    }

    public bootstrap = async () => {
        await this.producer.connect();
        await this.admin.connect()
    }
}