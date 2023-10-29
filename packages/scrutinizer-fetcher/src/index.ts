import {infrastructure} from 'scrutinizer-infrastructure';

import 'reflect-metadata';

import {types} from './@types';
import {ContainerInstance} from './injection';
import {KafkaTopicMigrator} from './migrations';
import {ILagCalculatorService, IValidatorService} from './services';

(async () => {
  const container = new ContainerInstance();

  await bootstrapInfrastructure(container);

  const kafkaTopicMigrator = container.get<KafkaTopicMigrator>(
    types.KafkaTopicMigrator
  );

  if (process.argv.slice(2).indexOf('--reset') > -1) {
    await kafkaTopicMigrator.migrate();
  }

  container.get<IValidatorService>(types.IValidator);
  container.get<ILagCalculatorService>(types.ILagCalculatorService);
})();

async function bootstrapInfrastructure(container: ContainerInstance) {
  const kafkaClient = container.get<infrastructure.messaging.IKafkaClient>(
    types.IKafkaClient
  );
  const ksqldb = container.get<infrastructure.ksql.IKsqldb>(types.IKsqlDb);

  await Promise.all([kafkaClient.bootstrap(), ksqldb.client.connect()]);
}
