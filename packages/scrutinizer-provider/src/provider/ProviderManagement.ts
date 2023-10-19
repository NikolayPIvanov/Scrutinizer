import EventEmitter = require('events');
import {ILoggerLike, to} from '../common';
import {ScrutinizerProviderEvents} from './ProviderManagementEvents';
import {
  IBlockLagCalculation,
  IBlockRetrieval,
  IProviderChainLagAndBlock,
  IProviderConfigurator,
  IProviderManagement,
} from './provider.interfaces';
import {ITransformedExtendedRpcInstance} from './scrapers';

export class ProviderManagement implements IProviderManagement {
  private blockLag = 0;
  private previousLatest = 0;
  private emitter = new EventEmitter();

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

  public onBlockLagCalculated(
    action: (calculation: IBlockLagCalculation) => Promise<void>
  ): void {
    this.emitter.on(ScrutinizerProviderEvents.BlockLagCalculated, action);
  }

  private async initializeTimers({
    lastCommitted,
    refreshProvidersInterval,
    blockLagThreshold,
    blockTime,
    checkBlockLagIntervalMultiplier,
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
      checkBlockLagIntervalMultiplier
    );
  }

  private initializePeriodicBlockLag = (
    blockLagThreshold: number,
    blockTime: number,
    checkBlockLagIntervalMultiplier: number
  ) => {
    let calculatingLag = false;
    setInterval(async () => {
      try {
        if (calculatingLag) {
          return;
        }

        calculatingLag = true;
        await this.calculateBlockLagAndLatestBlock();

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

  private initializeBlockTimeCalculation = async (lastCommitted: number) => {
    this.previousLatest = lastCommitted;

    const [, error] = await to(this.calculateBlockLagAndLatestBlock());
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
  private async calculateBlockLagAndLatestBlock() {
    // Get the block number from the providers.
    const latest = await this.blockRetrieval.getBlockNumber();
    if (!latest) {
      return;
    }

    // Set the pivot so we can have a starting point for the block lag calculation.
    const pivot = this.previousLatest || latest;
    const lag = latest - pivot;

    this.emitter.emit(ScrutinizerProviderEvents.BlockLagCalculated, {
      lag,
      previousLatest: this.previousLatest,
      latest,
    });

    // if (customParametersCalculator) {
    //   const calculation = await customParametersCalculator();
    //   this.blockLag = calculation.blockLag;
    //   this.lastCommitted = calculation.lastCommitted;

    //   return;
    // }

    this.blockLag = lag;
    this.previousLatest = latest;
  }

  private async calc() {
    const blocksPerIteration = Math.min(lag, maxBlocksPerIteration);
    if (blocksPerIteration === 0) {
      this.previousLatest = blockNumber;
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
