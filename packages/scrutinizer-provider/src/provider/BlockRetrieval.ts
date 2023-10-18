import {ILoggerLike, requestMultiplePromisesWithTimeout} from '../common';
import {getConsensusValue} from './consensus.utility';
import {
  IBlockRetrieval,
  IEvmApi,
  IFullJsonRpcBlock,
  IProviderConfigurator,
} from './provider.interfaces';

export class BlockRetrieval implements IBlockRetrieval {
  constructor(
    private logger: ILoggerLike,
    private providerConfiguration: IProviderConfigurator
  ) {}

  public async getFullBlock(
    blockNumber: number,
    maxRequestTime = 1000,
    forcedProvider?: IEvmApi
  ): Promise<IFullJsonRpcBlock | null> {
    try {
      if (forcedProvider) {
        return forcedProvider.getFullBlock(blockNumber);
      }

      const promises = this.providerConfiguration.providers.map(provider =>
        provider.getFullBlock(blockNumber)
      );

      const {success} = await requestMultiplePromisesWithTimeout(
        promises,
        maxRequestTime
      );

      const validated = success
        .filter(
          e =>
            !!e?.blockNumber &&
            !!e?.blockTimestamp &&
            !!e?.transactions &&
            !!e?.logs
        )
        .sort((a, b) => b!.logs?.length - a!.logs?.length);

      const bestBlock = validated.find(
        block =>
          !!block?.blockNumber &&
          !!block?.blockTimestamp &&
          block?.transactions?.length > 0 &&
          block?.logs?.length > 0
      );

      if (bestBlock?.blockNumber) {
        return bestBlock;
      }

      if (validated[0]?.blockNumber) {
        return validated[0];
      }
    } catch (error) {
      this.logger.error(error, 'getFullBlock');
    }

    return null;
  }

  public async getBlockNumber(maxRequestTime = 1000): Promise<number | null> {
    const promises = this.providerConfiguration.providers.map(provider =>
      provider.getBlockNumber()
    );

    const {success} = await requestMultiplePromisesWithTimeout(
      promises,
      maxRequestTime
    );

    if (success.length === 0) {
      this.logger.error('No valid block number found');

      return null;
    }

    const block = getConsensusValue(success);
    if (!block) {
      this.logger.error('No valid block number found');

      return null;
    }

    return block;
  }
}
