/* eslint-disable node/no-extraneous-import */
import 'reflect-metadata';

import {infrastructure} from 'scrutinizer-infrastructure';
import {ContainerInstance} from './injection/Container';
import {TYPES} from './injection/types';
import {
  INodeStorageRepository,
  IProvider,
  IProviderConfigurationMerger,
} from './provider/provider.interfaces';

(async () => {
  const container = new ContainerInstance();

  await bootstrapInfrastructure(container);
  await initializeProvider(container);
})();

async function bootstrapInfrastructure(container: ContainerInstance) {
  const kafkaClient = container.get<infrastructure.messaging.IKafkaClient>(
    TYPES.IKafkaClient
  );

  await kafkaClient.bootstrap();
}

async function initializeProvider(container: ContainerInstance) {
  const nodeStorageRepository = container.get<INodeStorageRepository>(
    TYPES.INodeStorageRepository
  );
  const providerConfigurationMerger =
    container.get<IProviderConfigurationMerger>(
      TYPES.IProviderConfigurationMerger
    );

  await nodeStorageRepository.init();

  const providersConfiguration =
    await providerConfigurationMerger.mergeConfigurations();

  const provider = container.get<IProvider>(TYPES.IProvider);

  await provider.initialize(providersConfiguration);
}
