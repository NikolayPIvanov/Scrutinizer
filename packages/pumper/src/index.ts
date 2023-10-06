import 'reflect-metadata';

import {ContainerInstance} from './Container';
import {TYPES} from './types';

(async () => {
  const container = new ContainerInstance();

  const configuration = container.get(TYPES.IConfiguration);

  console.log(configuration);
})();
