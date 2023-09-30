import { Kafka } from 'kafkajs';
export declare const kafka: Kafka;
export declare const producer: import("kafkajs").Producer;
export declare const initialize: () => Promise<void>;
