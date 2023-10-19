import {ILoggerLike, requestMultiplePromisesWithTimeout} from '../common';
import {
  IBlockRetrieval,
  IEvmApi,
  IFullJsonRpcBlock,
  IProviderConfigurator,
} from './provider.interfaces';
import {
  getBlockConsensusValue,
  getConsensusValue,
} from './utilities/consensus.utility';

export class BlockRetrieval implements IBlockRetrieval {
  constructor(
    private logger: ILoggerLike,
    private providerConfiguration: IProviderConfigurator
  ) {}

  public async getBlock(
    blockNumber: number,
    maxRequestTime = 1000,
    forceFastestProvider = false
  ): Promise<IFullJsonRpcBlock | null> {
    const time = Date.now();

    const block = await this.getFullBlock(
      blockNumber,
      maxRequestTime,
      this.getFastestProvider(forceFastestProvider)
    );

    if (Date.now() - time > maxRequestTime) {
      this.providerConfiguration.refreshProviders();
    }

    return block;
  }

  private getFastestProvider(
    forceFastestProvider: boolean
  ): IEvmApi | undefined {
    if (!forceFastestProvider) {
      return;
    }

    const fasterProvider = this.providerConfiguration.providers
      .filter(e => e.errorCount === 0)
      .sort((a, b) => a.latency - b.latency)?.[0];

    return fasterProvider ?? undefined;
  }

  private async getFullBlock(
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

      const validBlocks = success
        .filter(
          e =>
            !!e?.blockNumber &&
            !!e?.blockTimestamp &&
            !!e?.transactions &&
            !!e?.logs
        )
        .sort((a, b) => b!.logs?.length - a!.logs?.length);

      if (!validBlocks.length) {
        return null;
      }

      const consensusBlock = getBlockConsensusValue(
        validBlocks as IFullJsonRpcBlock[]
      );

      return consensusBlock ?? validBlocks[0];
    } catch (error) {
      this.logger.error(error, 'getFullBlock');

      return null;
    }
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
