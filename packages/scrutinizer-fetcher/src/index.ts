import {infrastructure} from 'scrutinizer-infrastructure';
// eslint-disable-next-line node/no-extraneous-import
import {factory} from 'scrutinizer-provider';

import 'reflect-metadata';

import {IConfiguration} from './configuration';
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

  await kafkaClient.bootstrap();
  await ksqldb.client.connect();
}

async function initializeProvider(container: ContainerInstance) {
  const configuration = container.get<IConfiguration>(TYPES.IConfiguration);

  const dbQueries = container.get<IDbQueries>(TYPES.IDbQueries);
  const latestCommittedBlockNumber =
    await dbQueries.getLatestCommittedBlockNumber();

  const provider = await factory.create({
    logger: container.get<infrastructure.logging.ILogger>(TYPES.ILogger),
    chainId: configuration.network.chainId,
    providerInitializerConfiguration: {
      ...configuration.network,
      lastCommitted: latestCommittedBlockNumber,
    },
  });
}
