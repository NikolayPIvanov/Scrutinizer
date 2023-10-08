import 'reflect-metadata';

import {ContainerInstance} from './Container';
import {IConfiguration} from './configuration';
import {IKafkaClient} from './messaging';
import {IConsumer} from './messaging/kafka.interfaces';
import {
  INodeStorageRepository,
  IProvider,
  IProviderConfigurationMerger,
} from './provider/provider.interfaces';
import {TYPES} from './types';

// const handle = async message => {
//   const raw = message.value?.toString();
//   if (!raw) {
//     this.logger.error(`Received empty block number, offset ${message.offset}`);
//     return;
//   }

//   const {blockNumber} = JSON.parse(raw);

//   if (Number.isNaN(blockNumber)) {
//     this.logger.error(
//       `Block number ${blockNumber} is not a number, offset ${message.offset}`
//     );
//     return;
//   }

//   const block = await this.provider.getBlock(blockNumber);

//   await this.kafkaClient.producer.send({
//     acks: 1,
//     topic: this.configuration.kafka.topics.fullBlock,
//     messages: [
//       {
//         key: message.key,
//         value: JSON.stringify(block),
//       },
//     ],
//   });

//   // this.logger.info(block);
// };

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

  await consumer.initialize({
    groupId: configuration.kafka.groups.blocks,
    topicsList: [configuration.kafka.topics.blocks.name],
    autoCommit: false,
    config: {
      maxBytesPerPartition: 1000000,
      heartbeatInterval: 3000,
      fromBeginning: true,
      maxParallelHandles: 1,
      maxQueueSize: 100,
    },
  });
})();
