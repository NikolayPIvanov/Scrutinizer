import {Consumer, ConsumerConfig, Producer} from 'kafkajs';

export interface IKafkaClient {
  producer: Producer;
  consumer: (config: ConsumerConfig, topic: string) => Promise<Consumer>;
  bootstrap: () => Promise<void>;
}

export interface IConsumer {
  initialize: () => Promise<void>;
}
