// import { kafka, producer } from "./Kafka";
// import axios from "axios";
// import { configuration } from "../configurations/configuration";
// import { KafkaMessage } from "kafkajs";
// import { to } from "../utils";
// import { logger } from "../infrastructure";
// import { splitByBytes } from "../utils/splitByBytesSize";

// export type IMinimalProduceRecord = {
//     value: string
// };

// const rpcUrl = !!configuration.infura.projectId ?
//     `${configuration.infura.baseUrl}${configuration.infura.projectId}`
//     : configuration.fallback.url;

// const client = axios.create({
//     baseURL: rpcUrl,
//     headers: { 'Content-Type': 'application/json' }
// });

// const prepareRequests = (messages: KafkaMessage[]) => {
//     const hashes = messages
//         .map((message: KafkaMessage) => message.value)
//         .filter((value: Buffer | null) => !!value)
//         .map((value: Buffer | null) => JSON.parse(value!.toString()))
//         .map(v => v.hash as string);

//     return hashes.map((hash, index) => ({
//         jsonrpc: "2.0",
//         id: index + 1,
//         method: "eth_getTransactionReceipt",
//         params: [hash]
//     }));
// }

// const send = async (response: any) => {
//     const messages = response?.data
//         .map(({ result }: any) => result)
//         .filter((receipt: any) => !!receipt)
//         .map((receipt: any) => ({
//             value: JSON.stringify(receipt)
//         } as IMinimalProduceRecord));

//     const requests = splitByBytes<IMinimalProduceRecord>(messages)
//         .map(({ rows }) => ({ messages: rows, topic: configuration.kafka.topics.receipts, }));

//     const [, err] = await to(Promise.all(requests.map(record => producer.send(record))));
//     if (err) logger.error(`Failed to send receipts`)
// }

// const process = async (messages: KafkaMessage[]) => {
//     const requests = prepareRequests(messages);
//     const [response, err] = await to(client.post("", requests));
//     if (err) {
//         throw err;
//     }

//     const [, error] = await to(send(response));
//     if (error) {
//         throw error;
//     }
// }

// const consumer = kafka.consumer({
//     groupId: configuration.kafka.groups.transactions
// });

// export const bootstrap = async () => {
//     await consumer.connect();
//     await consumer.subscribe({ topic: configuration.kafka.topics.transactions, fromBeginning: true });

//     // TODO: This will be updated in the future to handle better auto-commit on time period
//     await consumer.run({
//         eachBatchAutoResolve: false,
//         eachBatch: async ({ batch, resolveOffset, heartbeat, isRunning, isStale }) => {
//             if (!isRunning() || isStale()) return;

//             const [, error] = await to(process(batch.messages));
//             if (error) {
//                 logger.error(error);
//                 return;
//             }

//             const lastMessageIndex = batch.messages.length - 1;
//             const highestOffset = batch.messages[lastMessageIndex].offset;

//             resolveOffset(highestOffset);

//             await heartbeat()
//         }
//     })
// }