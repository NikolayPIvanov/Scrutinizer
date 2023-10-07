import 'reflect-metadata';

import {ContainerInstance} from './Container';
import {
  INodeStorageRepository,
  IProvider,
  IProviderConfigurationMerger,
} from './provider/provider.interfaces';
import {TYPES} from './types';

(async () => {
  const container = new ContainerInstance();

  const nodeStorageRepository = container.get<INodeStorageRepository>(
    TYPES.INodeStorageRepository
  );

  await nodeStorageRepository.init();

  const providerConfigurationMerger =
    container.get<IProviderConfigurationMerger>(
      TYPES.IProviderConfigurationMerger
    );

  const provider = container.get<IProvider>(TYPES.IProvider);

  const configuration = await providerConfigurationMerger.mergeConfigurations();

  console.log(configuration);

  provider.initialize(configuration);
})();
