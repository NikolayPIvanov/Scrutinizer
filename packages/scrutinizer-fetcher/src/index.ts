import {infrastructure} from 'scrutinizer-infrastructure';

import 'reflect-metadata';

import {ILogger} from 'scrutinizer-infrastructure/build/src/logging';
import {factory} from 'scrutinizer-provider';
import {IConfiguration} from './configuration';
import {ContainerInstance, TYPES} from './injection';
import {ILagCalculatorService, IValidatorService} from './services';

(async () => {
  const container = new ContainerInstance();

  await bootstrapInfrastructure(container);

  const logger = container.get<ILogger>(TYPES.ILogger);
  const configuration = container.get<IConfiguration>(TYPES.IConfiguration);
  const lagCalculatorService = container.get<ILagCalculatorService>(
    TYPES.ILagCalculatorService
  );

  const provider = await factory.create({
    logger,
    chainId: configuration.network.chainId,
    providerInitializerConfiguration: configuration.network,
  });

  await lagCalculatorService.initializePeriodicBlockLag(provider);

  container.get<IValidatorService>(TYPES.IValidator);
})();

async function bootstrapInfrastructure(container: ContainerInstance) {
  const kafkaClient = container.get<infrastructure.messaging.IKafkaClient>(
    TYPES.IKafkaClient
  );
  const ksqldb = container.get<infrastructure.ksql.IKsqldb>(TYPES.IKsqlDb);

  await Promise.all([kafkaClient.bootstrap(), ksqldb.client.connect()]);
}
