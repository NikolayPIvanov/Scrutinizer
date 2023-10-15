import {CompressionTypes} from 'kafkajs';
import {IKafkaClient} from 'scrutinizer-infrastructure/build/src/messaging';
import {IExtendedKafkaMessage} from 'scrutinizer-infrastructure/build/src/messaging/kafka/consumers/consumers.interface';
import {IConfiguration} from '../configuration';
import {IProvider} from '../provider';

export const validate = (message: IExtendedKafkaMessage) => {
  const raw = message.value?.toString();
  if (!raw) {
    throw new Error('Message value is empty');
  }

  const {blockNumber} = JSON.parse(raw);
  if (Number.isNaN(blockNumber)) {
    throw new Error(`Block number is not a number: ${blockNumber}`);
  }

  return blockNumber;
};

export const getBlockAndBroadcast = async ({
  message,
  blockNumber,
  origin,
  provider,
  kafkaClient,
  configuration,
}: {
  message: IExtendedKafkaMessage;
  blockNumber: number;
  origin: string;
  provider: IProvider;
  kafkaClient: IKafkaClient;
  configuration: IConfiguration;
}) => {
  const lag = +message.highWaterOffset - +message.offset;
  const forceFastestProvider = lag > 10;

  const block = await provider.getBlock(blockNumber, forceFastestProvider);

  if (!block) {
    throw new Error(`Block ${blockNumber} not found`);
  }

  await kafkaClient.producer.send({
    compression: CompressionTypes.GZIP,
    topic: configuration.kafka.topics.blocksFull.name,
    messages: [
      {
        key: message.key,
        value: JSON.stringify(block),
        headers: {
          'x-origin': origin,
          'x-original-message': `${message.topic}-${message.partition}-${message.offset}`,
        },
      },
    ],
  });
};
