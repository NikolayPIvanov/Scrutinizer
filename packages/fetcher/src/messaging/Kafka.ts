import {inject, injectable} from 'inversify';
import {Admin, ConsumerConfig, Kafka, Producer} from 'kafkajs';
import {IConfiguration} from '../configuration';
import {TYPES} from '../types';
import {IKafkaClient} from './kafka.interfaces';

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
    });

    this.admin = this.kafka.admin();
    this.producer = this.kafka.producer();
  }

  public consumer = async (config: ConsumerConfig, topics: string[]) => {
    const consumer = this.kafka.consumer(config);

    await consumer.connect();
    await consumer.subscribe({
      topics,
      fromBeginning: true,
    });

    return consumer;
  };

  public bootstrap = async () => {
    await this.producer.connect();
    await this.admin.connect();
  };
}
