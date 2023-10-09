import 'reflect-metadata';

import {ContainerInstance} from './Container';
import {IKafkaClient} from './messaging';
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

  await kafkaClient.bootstrap();

  await Promise.allSettled([nodeStorageRepository.init()]);

  const providersConfiguration =
    await providerConfigurationMerger.mergeConfigurations();

  provider.initialize(providersConfiguration);
})();
