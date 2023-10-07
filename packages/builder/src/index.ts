import 'reflect-metadata';

import {ContainerInstance} from './Container';
import {IKafkaClient} from './messaging';
import {IConsumer} from './messaging/kafka.interfaces';
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

  await Promise.allSettled([
    kafkaClient.bootstrap(),
    nodeStorageRepository.init(),
  ]);

  const configuration = await providerConfigurationMerger.mergeConfigurations();
  provider.initialize(configuration);

  const consumer = container.get<IConsumer>(TYPES.IBlockNumberConsumer);

  await consumer.initialize();
})();
