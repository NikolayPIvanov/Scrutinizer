/* eslint-disable node/no-extraneous-import */
import {infrastructure} from 'scrutinizer-infrastructure';

import 'reflect-metadata';

import {ILogger} from 'scrutinizer-infrastructure/build/src/logging';
import {factory} from 'scrutinizer-provider';
import {types} from './@types';
import {IConfiguration} from './configuration';
import {ContainerInstance} from './injection';
import {ILagCalculatorService, IValidatorService} from './services';

(async () => {
  const container = new ContainerInstance();

  await bootstrapInfrastructure(container);

  const logger = container.get<ILogger>(types.ILogger);
  const configuration = container.get<IConfiguration>(types.IConfiguration);
  const lagCalculatorService = container.get<ILagCalculatorService>(
    types.ILagCalculatorService
  );

  const provider = await factory.create({
    logger,
    chainId: configuration.network.chainId,
    providerInitializerConfiguration: configuration.network,
  });

  await lagCalculatorService.initializePeriodicBlockLagCalculation(provider);

  container.get<IValidatorService>(types.IValidator);
})();

async function bootstrapInfrastructure(container: ContainerInstance) {
  const kafkaClient = container.get<infrastructure.messaging.IKafkaClient>(
    types.IKafkaClient
  );
  const ksqldb = container.get<infrastructure.ksql.IKsqldb>(types.IKsqlDb);

  await Promise.all([kafkaClient.bootstrap(), ksqldb.client.connect()]);
}
