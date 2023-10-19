// eslint-disable-next-line node/no-extraneous-import
import {infrastructure} from 'scrutinizer-infrastructure';

import 'reflect-metadata';

import {ContainerInstance, TYPES} from './injection';
import {IDbQueries} from './ksql';
import {IValidator} from './validators';

(async () => {
  const container = new ContainerInstance();

  await bootstrapInfrastructure(container);
  await initializeProvider(container);

  container.get<IValidator>(TYPES.IValidator);
})();

async function bootstrapInfrastructure(container: ContainerInstance) {
  const kafkaClient = container.get<infrastructure.messaging.IKafkaClient>(
    TYPES.IKafkaClient
  );
  const ksqldb = container.get<infrastructure.ksql.IKsqldb>(TYPES.IKsqlDb);

  const nodeStorageRepository = container.get<INodeStorageRepository>(
    TYPES.INodeStorageRepository
  );

  await kafkaClient.bootstrap();
  await ksqldb.client.connect();
  await nodeStorageRepository.init();
}

async function initializeProvider(container: ContainerInstance) {
  const providerConfigurationMerger =
    container.get<IProviderConfigurationMerger>(
      TYPES.IProviderConfigurationMerger
    );
  const dbQueries = container.get<IDbQueries>(TYPES.IDbQueries);

  const configuration = await providerConfigurationMerger.mergeConfigurations();
  const provider = container.get<IProvider>(TYPES.IProvider);

  const latestCommittedBlockNumber =
    await dbQueries.getLatestCommittedBlockNumber();

  await provider.initialize(configuration, latestCommittedBlockNumber);
}
