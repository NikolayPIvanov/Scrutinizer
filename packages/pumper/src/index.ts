import 'reflect-metadata';

import {ContainerInstance} from './Container';
import {IKafkaClient} from './messaging';
import {
  INodeStorageRepository,
  IProvider,
  IProviderConfigurationMerger,
} from './provider/provider.interfaces';
import {TYPES} from './types';

import {bootstrap} from './ksql/KsqldbClient';
import {getLatestCommittedBlockNumber} from './ksql/Queries';
import {IRedisClient} from './Redis';

(async () => {
  await bootstrap();

  const container = new ContainerInstance();

  const kafkaClient = container.get<IKafkaClient>(TYPES.IKafkaClient);
  await kafkaClient.bootstrap();

  const redis = container.get<IRedisClient>(TYPES.IRedisClient);
  await redis.connect();

  const nodeStorageRepository = container.get<INodeStorageRepository>(
    TYPES.INodeStorageRepository
  );
  await nodeStorageRepository.init();

  const providerConfigurationMerger =
    container.get<IProviderConfigurationMerger>(
      TYPES.IProviderConfigurationMerger
    );
  const configuration = await providerConfigurationMerger.mergeConfigurations();

  const latestCommittedBlockNumber = await getLatestCommittedBlockNumber();

  console.log('latestCommittedBlockNumber', latestCommittedBlockNumber);
  const provider = container.get<IProvider>(TYPES.IProvider);
  provider.initialize(configuration, latestCommittedBlockNumber);
})();
