import EventEmitter = require('events');
import {ILoggerLike, to} from '../common';
import {ScrutinizerProviderEvents} from './ProviderManagementEvents';
import {
  IProviderInitializerConfiguration,
  IProviderManagementConfiguration,
} from './factories/factories.interfaces';
import {
  IBlockLagCalculation,
  IBlockRetrieval,
  IProviderConfigurator,
  IProviderManagement,
} from './provider.interfaces';

export class ProviderManagement implements IProviderManagement {
  private blockLag = 0;
  private previousLatest = 0;
  private emitter = new EventEmitter();

  constructor(
    private logger: ILoggerLike,
    private providerConfigurator: IProviderConfigurator,
    private blockRetrieval: IBlockRetrieval
  ) {}

  get api(): IBlockRetrieval {
    return this.blockRetrieval;
  }

  public initialize = async ({
    providerRpcConfiguration,
    lastCommitted,
    refreshProvidersInterval,
    blockLagThreshold,
    blockTime,
    checkBlockLagIntervalMultiplier,
  }: IProviderInitializerConfiguration) => {
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
  }: IProviderManagementConfiguration) {
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
    this.blockLag = lag;
    this.previousLatest = latest;
  }
}
