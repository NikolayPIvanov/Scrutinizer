import 'reflect-metadata';

import {infrastructure} from 'scrutinizer-infrastructure';
import {types} from './@types';
import {ContainerInstance} from './injection/Container';

(async () => {
  const container = new ContainerInstance();

  await bootstrapInfrastructure(container);
})();

async function bootstrapInfrastructure(container: ContainerInstance) {
  const kafkaClient = container.get<infrastructure.messaging.IKafkaClient>(
    types.IKafkaClient
  );

  await kafkaClient.bootstrap();
}
