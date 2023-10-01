
import { kafka } from "./Kafka";
import { configuration } from "../configurations/Configurator";
import { handle } from "../handlers/latestBlock/LatestBlockEventHandler";

const consumer = kafka.consumer({
    groupId: configuration.kafka.groups.blocks
});

export const bootstrap = async () => {
    await consumer.connect();
    await consumer.subscribe({ topic: configuration.kafka.topics.blocks, fromBeginning: true });

    await consumer.run({
        eachMessage: async (payload) => {
            if (!payload.message.value) return;

            const block = JSON.parse(payload.message.value.toString());

            await handle(block.number);
        },
    })
}