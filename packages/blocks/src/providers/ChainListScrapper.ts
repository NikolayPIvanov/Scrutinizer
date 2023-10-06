import axios, {AxiosInstance} from 'axios';
import {inject, injectable} from 'inversify';
import {IConfiguration, ILogger, IScrapper, TYPES} from '../types';
import {to} from '../utils';

const DEFI_LLAMA_GITHUB_BASE_URL =
  'https://raw.githubusercontent.com/DefiLlama/chainlist/';

const MAIN_GITHUB_RPC_URL = 'main/constants/chainIds.json';
const FALLBACK_GITHUB_RPC_URL =
  '5e2fa1ff401f5e66ebd02b3828da7180c1a7e2f3/constants/chainIds.json';

const MAIN_RPC_GITHUB_RPC_URL = 'main/constants/extraRpcs.js';
const FALLBACK_RPC_GITHUB_RPC_URL =
  'b9857beb81d48c041ad906a6bb51e4b36fc58186/constants/extraRpcs.js';

@injectable()
export class ChainListScrapper implements IScrapper<any> {
  private httpClient: AxiosInstance;

  constructor(
    @inject(TYPES.ILogger) private logger: ILogger,
    @inject(TYPES.IConfiguration) private configuration: IConfiguration
  ) {
    this.httpClient = axios.create({
      baseURL: DEFI_LLAMA_GITHUB_BASE_URL,
    });
  }

  public scrape = async () => {
    const [chainIdsList, rpcUrlsList] = await Promise.all([
      this.scrapeChainIds(),
      this.scrapeRpcUrls(),
    ]);
    if (!rpcUrlsList) {
      throw new Error('No RPC list variable!');
    }

    const chainRpcUrlListMapping = Object.keys(rpcUrlsList).reduce(
      (acc, key) => {
        return {
          ...acc,
          [key]: {
            ...rpcUrlsList[key],
            chainId: +key,
            name: chainIdsList[key] || null,
          },
        };
      },
      {}
    );

    const data = Object.values(chainRpcUrlListMapping)
      .map((row: any) => ({
        ...row,
        rpcs: row.rpcs
          .map((r: any) => {
            if (r.url) {
              return r.url;
            }

            return r;
          })
          // Filter infura
          .filter((k: string) => !k.includes('infura.io'))
          // Fitler bsc-dataseed no Txlogs
          .filter((k: string) => !k.includes('bsc-dataseed'))
          // Shuffle the array
          .sort((a: any, b: any) => (Math.random() > 0.5 ? -1 : 1)),
      }))
      .filter(
        (x: any) =>
          x.name &&
          x.rpcs.length >= 3 &&
          x.chainId === this.configuration.network.chainId
      );

    return data;
  };

  private scrapeRpcUrls = async () => {
    const data = await this.scrapeRpcUrlFromUrl(MAIN_RPC_GITHUB_RPC_URL);
    if (data) {
      return data;
    }

    return this.scrapeRpcUrlFromUrl(FALLBACK_RPC_GITHUB_RPC_URL);
  };

  private scrapeRpcUrlFromUrl = async (url: string) => {
    const [response, error] = await to(
      this.httpClient.get(url, {
        responseType: 'text',
      })
    );
    if (response) {
      return this.transformRpcList(response.data);
    }

    this.logger.error(error);

    return null;
  };

  private transformRpcList = (data: string) => {
    const regex = /export const extraRpcs = ({[\s\S]*});/;
    const match = data.match(regex);
    if (!match) {
      return;
    }

    const privacyStatement = {};

    const rpcList = eval('(' + match[1] + ')');

    rpcList['1'].rpcs.push({
      url: 'https://eth.llamarpc.com',
      tracking: 'none',
      trackingDetails: 'privacyStatement',
    });

    rpcList['137'].rpcs.push({
      url: 'https://polygon.llamarpc.com',
      tracking: 'none',
      trackingDetails: 'privacyStatement',
    });

    return rpcList;
  };

  private scrapeChainIds = async () => {
    const data = await this.scrapeChainIdsFromUrl(MAIN_GITHUB_RPC_URL);
    if (data) {
      return data;
    }

    return this.scrapeChainIdsFromUrl(FALLBACK_GITHUB_RPC_URL);
  };

  private scrapeChainIdsFromUrl = async (url: string) => {
    const [response, error] = await to(this.httpClient.get(url));
    if (response?.data) {
      return response.data;
    }

    this.logger.error(error);

    return null;
  };
}
