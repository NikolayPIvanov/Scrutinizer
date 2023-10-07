import {Producer} from 'kafkajs';

export interface IKafkaClient {
  producer: Producer;
  bootstrap: () => Promise<void>;
}
