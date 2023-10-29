import {infrastructure} from 'scrutinizer-infrastructure';

import 'reflect-metadata';

import {types} from './@types';
import {ContainerInstance} from './injection';
import {KafkaTopicMigrator, KsqlMigrator} from './migrations';
import {ILagCalculatorService, IValidatorService} from './services';

(async () => {
  const container = new ContainerInstance();

  await bootstrapInfrastructure(container);

  const ksqlMigrator = container.get<KsqlMigrator>(types.KsqlMigrator);
  const kafkaTopicMigrator = container.get<KafkaTopicMigrator>(
    types.KafkaTopicMigrator
  );

  await kafkaTopicMigrator.migrate();
  await ksqlMigrator.migrate();

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
