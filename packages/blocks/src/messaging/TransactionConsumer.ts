import { kafka, producer } from "./Kafka";
import axios from "axios";
import { configuration } from "../configurations/Configurator";
import { KafkaMessage } from "kafkajs";
import { to } from "../utils";

const rpcUrl = !!configuration.infura.projectId ?
    `${configuration.infura.baseUrl}${configuration.infura.projectId}`
    : configuration.fallback.url;

const client = axios.create({
    baseURL: rpcUrl,
    headers: { 'Content-Type': 'application/json' }
});

const prepareRequests = (messages: KafkaMessage[]) => {
    const hashes = messages
        .map((message: KafkaMessage) => message.value)
        .filter((value: Buffer | null) => !!value)
        .map((value: Buffer | null) => JSON.parse(value!.toString()))
        .map(v => v.hash as string);

    return hashes.map((hash, index) => ({
        jsonrpc: "2.0",
        id: index + 1,
        method: "eth_getTransactionReceipt",
        params: [hash]
    }));
}

const send = async (response: any) => {
    const messages = response?.data
        .map(({ result }: any) => result)
        .filter((receipt: any) => !!receipt)
        .map((receipt: any) => ({
            value: JSON.stringify(receipt)
        }));

    const chunkSize = 50;
    const requests = [];
    for (let i = 0; i < messages.length; i += chunkSize) {
        const chunk = messages.slice(i, i + chunkSize);
        requests.push({
            topic: configuration.kafka.topics.receipts,
            messages: chunk
        })
    }

    await Promise.all(requests.map(r => producer.send(r)));
}

const process = async (messages: KafkaMessage[]) => {
    const requests = prepareRequests(messages);
    const [response, err] = await to(client.post("", requests));
    if (err) {
        console.log(err);

        return;
    }

    const [, error] = await to(send(response));
    if (error) {
        console.log(error);
    }
}

const consumer = kafka.consumer({
    groupId: configuration.kafka.groups.transactions
});

export const bootstrap = async () => {
    await consumer.connect();
    await consumer.subscribe({ topic: configuration.kafka.topics.transactions, fromBeginning: true });

    // TODO: This will be updated in the future to handle better auto-commit on time period
    await consumer.run({
        eachBatchAutoResolve: false,
        eachBatch: async ({ batch, resolveOffset, heartbeat, isRunning, isStale }) => {
            if (!isRunning() || isStale()) return;

            const [, error] = await to(process(batch.messages));
            if (error) {
                console.log(error);
                return;
            }

            const lastMessageIndex = batch.messages.length - 1;
            const highestOffset = batch.messages[lastMessageIndex].offset;

            resolveOffset(highestOffset);

            await heartbeat()
        }
    })
}