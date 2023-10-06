import 'reflect-metadata';

import {ContainerInstance} from './Container';
import {IProviderConfigurationMerger} from './provider/provider.interfaces';
import {TYPES} from './types';

(async () => {
  const container = new ContainerInstance();

  const providerConfigurationMerger =
    container.get<IProviderConfigurationMerger>(
      TYPES.IProviderConfigurationMerger
    );

  console.log(await providerConfigurationMerger.mergeConfigurations());
})();
