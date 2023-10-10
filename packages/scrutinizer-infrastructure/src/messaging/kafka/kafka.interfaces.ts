import {
  Consumer,
  ConsumerConfig,
  ConsumerSubscribeTopics,
  KafkaConfig,
  Producer,
} from 'kafkajs';

export type IKafkaConfiguration = KafkaConfig;
export type IConsumerConfiguration = ConsumerConfig;
export type ISubscription = ConsumerSubscribeTopics;
export type IProducer = Producer;
export type IConsumer = Consumer;

export interface IKafkaClient {
  producer: IProducer;
  consumer: (
    consumerConfiguration: IConsumerConfiguration,
    subscription: ISubscription
  ) => Promise<IConsumer>;
  bootstrap: () => Promise<void>;
}
