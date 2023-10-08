import 'reflect-metadata';

import {ContainerInstance} from './Container';
import {IConfiguration} from './configuration';
import {IKafkaClient} from './messaging';
import {IConsumer, IExtendedKafkaMessage} from './messaging/kafka.interfaces';
import {
  INodeStorageRepository,
  IProvider,
  IProviderConfigurationMerger,
} from './provider/provider.interfaces';
import {TYPES} from './types';

(async () => {
  const container = new ContainerInstance();

  const kafkaClient = container.get<IKafkaClient>(TYPES.IKafkaClient);
  const nodeStorageRepository = container.get<INodeStorageRepository>(
    TYPES.INodeStorageRepository
  );
  const providerConfigurationMerger =
    container.get<IProviderConfigurationMerger>(
      TYPES.IProviderConfigurationMerger
    );
  const provider = container.get<IProvider>(TYPES.IProvider);
  const configuration = container.get<IConfiguration>(TYPES.IConfiguration);

  await Promise.allSettled([
    kafkaClient.bootstrap(),
    nodeStorageRepository.init(),
  ]);

  const providersConfiguration =
    await providerConfigurationMerger.mergeConfigurations();
  provider.initialize(providersConfiguration);

  const consumer = container.get<IConsumer>(TYPES.IConsumer);

  const handle = async (message: IExtendedKafkaMessage) => {
    const raw = message.value?.toString();
    if (!raw) {
      return;
    }

    const {blockNumber} = JSON.parse(raw);

    if (Number.isNaN(blockNumber)) {
      return;
    }

    const lag = +message.highWaterOffset - +message.offset;
    const forceFastestProvider = lag > 100;

    const block = await provider.getBlock(blockNumber, forceFastestProvider);

    await kafkaClient.producer.send({
      acks: 1,
      topic: configuration.kafka.topics.fullBlock.name,
      messages: [
        {
          key: message.key,
          value: JSON.stringify(block),
        },
      ],
    });
  };

  await consumer.initialize({
    groupId: configuration.kafka.groups.blocks,
    topicsList: [configuration.kafka.topics.blocks.name],
    autoCommit: false,
    onData: handle,
    config: {
      maxBytesPerPartition: 1000000,
      heartbeatInterval: 3000,
      fromBeginning: true,
      maxParallelHandles: 1,
      maxQueueSize: 100,
      retryTopic: configuration.kafka.topics.retryBlocks.name,
    },
  });
})();
