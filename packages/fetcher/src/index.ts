// eslint-disable-next-line node/no-extraneous-import
import {infrastructure} from 'scrutinizer-infrastructure';

import 'reflect-metadata';

import {ContainerInstance} from './injection/Container';
import {TYPES} from './injection/types';
import {IDbQueries} from './ksql/ksql.interfaces';
import {
  INodeStorageRepository,
  IProvider,
  IProviderConfigurationMerger,
} from './provider/provider.interfaces';
import {IBlockRoot, IValidator} from './validators/Validator';

(async () => {
  const container = new ContainerInstance();
  const kafkaClient = container.get<infrastructure.messaging.IKafkaClient>(
    TYPES.IKafkaClient
  );
  const ksqldb = container.get<infrastructure.ksql.IKsqldb>(TYPES.IKsqlDb);
  const dbQueries = container.get<IDbQueries>(TYPES.IDbQueries);
  const redis = container.get<infrastructure.caching.redis.IRedisClient>(
    TYPES.IRedisClient
  );
  const logger = container.get<infrastructure.logging.ILogger>(TYPES.ILogger);
  const validator = container.get<IValidator>(TYPES.IValidator);

  await kafkaClient.bootstrap();
  await ksqldb.client.connect();
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
  const configuration = await providerConfigurationMerger.mergeConfigurations();

  const latestCommittedBlockNumber =
    await dbQueries.getLatestCommittedBlockNumber();
  // const cacheLastCommittedBlockNumber = await redis.get('lastCommittedBlockNumber')
  logger.info(latestCommittedBlockNumber, 'latestCommittedBlockNumber');

  await provider.initialize(configuration, latestCommittedBlockNumber);

  const blocks = await redis.hScanAndGetAll<IBlockRoot>();
  blocks.forEach(block => validator.push(block));
})();
