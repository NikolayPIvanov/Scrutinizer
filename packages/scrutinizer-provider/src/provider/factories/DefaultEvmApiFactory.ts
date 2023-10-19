import {EvmApi} from '../EvmApi';
import {
  IEvmApi,
  INodeStorageRepository,
  IRpcInstanceMetadata,
} from '../provider.interfaces';
import {IEvmApiFactory} from './factories.interfaces';

export class DefaultEvmApiFactory implements IEvmApiFactory {
  public async create(
    repository: INodeStorageRepository,
    configuration: IRpcInstanceMetadata
  ): Promise<IEvmApi> {
    return new EvmApi(repository, configuration);
  }
}
