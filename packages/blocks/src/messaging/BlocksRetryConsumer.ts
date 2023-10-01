import { kafka } from "./Kafka";
import { configuration } from "../configurations/Configurator";
import { KafkaMessage } from "kafkajs";
import { IBlockJob, emitter } from "../handlers/blockNumber/BlockNumberEmitter";

const DEFAULT_HEARTBEAT_INTERVAL = 2500;
const RETRIES_THRESHOLD = 3;
const DELAY_PER_RETRY = 300;

const process = async ({ message, heartbeat }: { message: KafkaMessage, heartbeat: () => Promise<void> }) => {
    const { blockNumber, retries } = JSON.parse(message.value!.toString()) as IBlockJob
    if (retries! > RETRIES_THRESHOLD) {
        console.log(`Tried ${blockNumber} ${retries} times and still failed, marking as errored.`);
        return;
    }

    const interval = setInterval(async () => heartbeat(), DEFAULT_HEARTBEAT_INTERVAL);

    const current = retries! + 1;
    setTimeout(async () => {
        emitter.addToQueue({ blockNumber, retries: current, callback: () => clearInterval(interval) })
    }, current * DELAY_PER_RETRY);
}

const consumer = kafka.consumer({
    groupId: configuration.kafka.groups.blockNumberRetry
});

export const bootstrap = async () => {
    await consumer.connect();
    await consumer.subscribe({ topic: configuration.kafka.topics.blocksNumberRetry, fromBeginning: true });

    // TODO: This will be updated in the future to handle better auto-commit on time period
    await consumer.run({
        eachMessage: async ({ message, heartbeat }) => process({ message, heartbeat }),
    })
}