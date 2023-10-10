import {injectable} from 'inversify';
import {Admin, Kafka, Producer} from 'kafkajs';
import {
  IConsumerConfiguration,
  IKafkaClient,
  IKafkaConfiguration,
  ISubscription,
} from './kafka.interfaces';

@injectable()
export class KafkaClient implements IKafkaClient {
  private readonly kafka: Kafka;
  private readonly admin: Admin;
  public readonly producer: Producer;

  constructor(configuration: IKafkaConfiguration) {
    this.kafka = new Kafka(configuration);

    this.admin = this.kafka.admin();
    this.producer = this.kafka.producer();
  }

  public bootstrap = async () => {
    await Promise.all([this.producer.connect(), this.admin.connect()]);
  };

  public consumer = async (
    consumerConfiguration: IConsumerConfiguration,
    subscription: ISubscription
  ) => {
    const consumer = this.kafka.consumer(consumerConfiguration);

    await consumer.connect();
    await consumer.subscribe(subscription);

    return consumer;
  };
}
