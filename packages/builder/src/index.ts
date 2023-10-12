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

  const kafkaClient = container.get<infrastructure.messaging.IKafkaClient>(
    TYPES.IKafkaClient
  );

  const redis = container.get<infrastructure.caching.redis.IRedisClient>(
    TYPES.IRedisClient
  );

  await kafkaClient.bootstrap();
  await redis.connect();

  const nodeStorageRepository = container.get<INodeStorageRepository>(
    TYPES.INodeStorageRepository
  );
  const providerConfigurationMerger =
    container.get<IProviderConfigurationMerger>(
      TYPES.IProviderConfigurationMerger
    );
  const provider = container.get<IProvider>(TYPES.IProvider);

  await nodeStorageRepository.init();

  const providersConfiguration =
    await providerConfigurationMerger.mergeConfigurations();

  await provider.initialize(providersConfiguration);
})();
