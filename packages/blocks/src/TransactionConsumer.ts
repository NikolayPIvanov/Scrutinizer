import { kafka, producer } from "./Kafka";
import { JsonRpcProvider, Network, dataLength } from 'ethers';
import axios from "axios";
import { configuration } from "./Configurator";
import { KafkaMessage } from "kafkajs";

const process = async (hashes: string[]) => {
    const endpoint = `https://mainnet.infura.io/v3/${configuration.infura.projectId}`;

    const reqs = hashes.map((hash, index) => ({
        jsonrpc: "2.0",
        id: index + 1,
        method: "eth_getTransactionReceipt",
        params: [hash]
    }));

    const client = axios.create({
        baseURL: endpoint,
        headers: { 'Content-Type': 'application/json' }
    })

    const body = reqs;
    try {
        const res = await client.post("", body);

        return res.data.map(({ result }: any) => result).filter((r: any) => !!r);
    }
    catch (e) {
        console.log(e)

        return [];
    }
}

const consumer = kafka.consumer({
    groupId: 'test-group'
})

export const initialize = async () => {
    await consumer.connect();
    await consumer.subscribe({ topic: 'transactions', fromBeginning: true });

    await consumer.run({
        eachBatchAutoResolve: false,
        eachBatch: async ({ batch, resolveOffset, heartbeat, isRunning, isStale }) => {
            if (!isRunning() || isStale()) return;

            const hashes = batch.messages
                .map((message: KafkaMessage) => message.value)
                .filter((value: Buffer | null) => !!value)
                .map((value: Buffer | null) => JSON.parse(value!.toString()))
                .map(v => v.hash) as string[];

            const receipts = await process(hashes);

            await producer.send(
                {
                    topic: "receipts",
                    messages: receipts.map((receipt: any) => ({
                        value: JSON.stringify(receipt)
                    }))
                },
            );

            resolveOffset(batch.messages[batch.messages.length - 1].offset);

            await heartbeat()
        }
    })
}