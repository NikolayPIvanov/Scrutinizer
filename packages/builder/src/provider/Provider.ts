import {inject, injectable} from 'inversify';
import {to} from '../common';
import {IConfiguration} from '../configuration';
import {ILogger} from '../logger';
import {TYPES} from '../types';
import {EvmApi} from './EvmApi';
import {
  IEvmApi,
  INodeStorageRepository,
  IProvider,
} from './provider.interfaces';
import {ITransformedExtendedRpcInstance} from './scrapers/scraper.interfaces';
import {requestMultiplePromisesWithTimeout} from './utils';

export const getConsensusValue = (arr: number[]): number => {
  const frequency = new Map();
  let maxCount = 0;
  let consensusValue = 0;

  if (arr.length === 0) {
    throw new Error('Cannot get consensus value of empty array');
  }

  for (const value of arr) {
    const count = frequency.get(value) || 0;
    frequency.set(value, count + 1);

    if (count + 1 > maxCount) {
      maxCount = count + 1;
      consensusValue = value;
    }
  }

  return consensusValue;
};

@injectable()
export class Provider implements IProvider {
  private providers: IEvmApi[] = [];
  private allProviders: IEvmApi[] = [];
  private providerRpcConfiguration: ITransformedExtendedRpcInstance | undefined;

  constructor(
    @inject(TYPES.ILogger) private logger: ILogger,
    @inject(TYPES.IConfiguration) private configuration: IConfiguration,
    @inject(TYPES.INodeStorageRepository)
    private nodeStorageRepository: INodeStorageRepository
  ) {}

  public initialize = async (
    providerRpcConfiguration: ITransformedExtendedRpcInstance
  ) => {
    this.providerRpcConfiguration = providerRpcConfiguration;

    await this.loadProviders();

    this.start();
  };

  public async getBlock(blockNumber: number, forceFastestProvider?: boolean) {
    const time = Date.now();

    const blockFull = await this.getFullBlock(
      blockNumber,
      forceFastestProvider ? this.getFastestProvider() : undefined
    );

    if (Date.now() - time > this.configuration.network.maxRequestTime) {
      this.refreshProviders();
    }

    return blockFull;
  }

  private getFastestProvider() {
    const fasterProvider = this.providers
      .filter(e => e.errorCount === 0)
      .sort((a, b) => a.latency - b.latency)?.[0];

    return fasterProvider ?? null;
  }

  private async loadProviders() {
    if (this.providerRpcConfiguration === undefined) {
      throw new Error('Missing configuration');
    }

    const providers = this.providerRpcConfiguration?.rpcs!.map(
      rpc =>
        new EvmApi(this.nodeStorageRepository, {
          endpoint: rpc,
          chainId: this.providerRpcConfiguration!.chainId!,
          chainName: this.providerRpcConfiguration!.name!,
        }) as unknown as IEvmApi
    );

    this.allProviders = await Promise.all(
      providers?.map(async provider => {
        if (
          this.providers.length >= this.configuration.network.maxProviderCount
        ) {
          return provider;
        }

        const [chainId, error] = await to(provider.getChainId());
        if (error) {
          return provider;
        }

        if (chainId === this.providerRpcConfiguration?.chainId) {
          this.providers.push(provider);
        }

        return provider;
      })
    );
  }

  private async start() {
    this.initializePeriodicProviderRefresh();
  }

  private initializePeriodicProviderRefresh = () =>
    setInterval(
      () => this.refreshProviders(),
      this.configuration.network.refreshProvidersInterval
    );

  private async getFullBlock(blockNumber: number, forcedProvider?: IEvmApi) {
    try {
      if (forcedProvider) {
        return forcedProvider.getFullBlock(blockNumber);
      }

      const promises = this.providers.map(provider => {
        return provider.getFullBlock(blockNumber);
      });

      const {success} = await requestMultiplePromisesWithTimeout(
        promises,
        this.configuration.network.maxRequestTime
      );

      const validated = success
        .filter(
          e => !!e?.number && !!e?.timestamp && !!e?.transactions && !!e?.txLogs
        )
        .sort((a, b) => b.txLogs?.length - a.txLogs?.length);

      const bestBlock = validated.find(
        block =>
          !!block?.number &&
          !!block?.timestamp &&
          block?.transactions?.length > 0 &&
          block?.txLogs?.length > 0
      );

      if (bestBlock?.number) {
        return bestBlock;
      }

      if (validated[0]?.number) {
        return validated[0];
      }

      console.log(success);
    } catch (error) {
      this.logger.error(error);
    }

    this.logger.error(
      `No valid block found! Chain: ${this.providerRpcConfiguration?.name}, block: ${blockNumber}`
    );

    return null;
  }

  private async refreshProviders() {
    try {
      const availableProviders = this.allProviders.filter(
        e => !this.providers.find(k => k.endpointUrl === e.endpointUrl)
      );

      if (availableProviders.length < 1) {
        return;
      }

      if (
        this.providers.filter(e => e.errorCount > 0 || e.latency > 500)
          .length === 0
      ) {
        return;
      }

      if (Math.random() > 0.5) {
        this.providers.sort((a, b) => a.errorCount - b.errorCount);
      } else {
        this.providers.sort((a, b) => a.latency - b.latency);
      }

      const nextProvider = availableProviders[0];

      const [, error] = await to(nextProvider.getBlock());
      if (error) {
        return;
      }

      const [chainId, err] = await to(nextProvider.getChainId());
      if (err) {
        return;
      }

      if (chainId === this.providerRpcConfiguration?.chainId) {
        this.providers.pop();

        this.providers.push(nextProvider);
      }
    } catch (error: unknown) {
      this.logger.error(`${(error as any).message!}`);
    }
  }
}
