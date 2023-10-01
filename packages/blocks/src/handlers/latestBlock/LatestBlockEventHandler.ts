import { configuration } from "../../configurations/Configurator";
import { producer } from "../../messaging/Kafka"

let latestBlockNumber = 0;

export const handle = async (blockNumber: number) => {
    latestBlockNumber = Math.max(latestBlockNumber, blockNumber);

    return producer.send({
        topic: configuration.kafka.topics.blocksLatest,
        messages: [
            {
                value: JSON.stringify({ latestBlockNumber })
            }
        ]
    })
};