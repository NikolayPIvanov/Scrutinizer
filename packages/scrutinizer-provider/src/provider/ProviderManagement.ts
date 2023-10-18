import {ILoggerLike, to} from '../common';
import {
  IBlockRetrieval,
  IProviderChainLagAndBlock,
  IProviderConfigurator,
  IProviderManagement,
} from './provider.interfaces';
import {ITransformedExtendedRpcInstance} from './scrapers';

export class ProviderManagement implements IProviderManagement {
  private blockLag = 0;
  private lastCommitted = 0;

  constructor(
    private logger: ILoggerLike,
    private providerConfigurator: IProviderConfigurator,
    private blockRetrieval: IBlockRetrieval
  ) {}

  public initialize = async (
    providerRpcConfiguration: ITransformedExtendedRpcInstance,
    lastCommitted = 0,
    refreshProvidersInterval = 60000,
    blockLagThreshold = 30,
    blockTime: number,
    checkBlockLagIntervalMultiplier = 30
  ) => {
    await this.providerConfigurator.prepareProviders(providerRpcConfiguration);

    this.initializeTimers({
      lastCommitted,
      refreshProvidersInterval,
      blockLagThreshold,
      blockTime,
      checkBlockLagIntervalMultiplier,
    });
  };

  private async initializeTimers({
    lastCommitted,
    refreshProvidersInterval,
    blockLagThreshold,
    blockTime,
    checkBlockLagIntervalMultiplier,
    customParametersCalculator,
  }: {
    lastCommitted: number;
    refreshProvidersInterval: number;
    blockLagThreshold: number;
    blockTime: number;
    checkBlockLagIntervalMultiplier: number;
    customParametersCalculator?: () => Promise<IProviderChainLagAndBlock>;
  }) {
    await this.initializeBlockTimeCalculation(lastCommitted);

    this.initializePeriodicProviderRefresh(refreshProvidersInterval);
    this.initializePeriodicBlockLag(
      blockLagThreshold,
      blockTime,
      checkBlockLagIntervalMultiplier,
      customParametersCalculator
    );
  }

  private initializePeriodicBlockLag = (
    blockLagThreshold: number,
    blockTime: number,
    checkBlockLagIntervalMultiplier: number,
    customParametersCalculator?: () => Promise<IProviderChainLagAndBlock>
  ) => {
    let calculatingLag = false;
    setInterval(async () => {
      try {
        if (calculatingLag) {
          return;
        }

        calculatingLag = true;
        await this.calculateBlockLagAndLatestBlock(customParametersCalculator);

        if (this.blockLag > blockLagThreshold) {
          this.providerConfigurator.refreshProviders();
        }
      } catch (error) {
        this.logger.error(error, 'initializePeriodicBlockLag');
      } finally {
        calculatingLag = false;
      }
    }, blockTime * checkBlockLagIntervalMultiplier);
  };

  private initializeBlockTimeCalculation = async (
    lastCommitted: number,
    customParametersCalculator?: () => Promise<IProviderChainLagAndBlock>
  ) => {
    this.lastCommitted = lastCommitted;

    const [, error] = await to(
      this.calculateBlockLagAndLatestBlock(customParametersCalculator)
    );
    if (error) {
      this.logger.error('calculateBlockTime', error);
    }
  };

  private initializePeriodicProviderRefresh = (
    refreshProvidersInterval: number
  ) =>
    setInterval(
      () => this.providerConfigurator.refreshProviders(),
      refreshProvidersInterval
    );

  /**
   * Calculates the block lag and latest block on the blockchain.
   * Latest block is the highest block number returned by the providers.
   * A consensus value is calculated from the providers where the most common block number is returned.
   * Block lag is the difference between the latest block and the last committed block.
   */
  private async calculateBlockLagAndLatestBlock(
    customParametersCalculator?: () => Promise<IProviderChainLagAndBlock>
  ) {
    // Get the block number from the providers.
    const blockNumber = await this.blockRetrieval.getBlockNumber();
    if (!blockNumber) {
      return;
    }

    // Set the pivot so we can have a starting point for the block lag calculation.
    const pivot = this.lastCommitted || blockNumber;
    const lag = blockNumber - pivot;

    if (customParametersCalculator) {
      const calculation = await customParametersCalculator();
      this.blockLag = calculation.blockLag;
      this.lastCommitted = calculation.lastCommitted;

      return;
    }

    this.blockLag = lag;
    this.lastCommitted = blockNumber;
  }

  private async calc() {
    const blocksPerIteration = Math.min(lag, maxBlocksPerIteration);
    if (blocksPerIteration === 0) {
      this.lastCommitted = blockNumber;
      return;
    }

    const blockNumbers = this.constructConsequentArray(
      blocksPerIteration,
      pivot
    );

    // First send the block numbers to Kafka.
    await this.sendBlockNumbersToKafka(blockNumbers);
  }
}
