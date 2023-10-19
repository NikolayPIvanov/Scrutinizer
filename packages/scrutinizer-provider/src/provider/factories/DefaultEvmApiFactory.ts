import {EvmApi} from '../EvmApi';
import {
  IEvmApi,
  IEvmApiFactory,
  INodeStorageRepository,
  IRpcInstanceMetadata,
} from '../provider.interfaces';

export class DefaultEvmApiFactory implements IEvmApiFactory {
  public async create(
    repository: INodeStorageRepository,
    configuration: IRpcInstanceMetadata
  ): Promise<IEvmApi> {
    return new EvmApi(repository, configuration);
  }
}
