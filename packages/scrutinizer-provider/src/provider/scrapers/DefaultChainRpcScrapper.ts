import axios, {AxiosInstance} from 'axios';
import {ILoggerLike, to} from '../../common';
import {
  DEFI_LLAMA_GITHUB_BASE_URL,
  FALLBACK_RPC_GITHUB_RPC_URL,
  MAIN_RPC_GITHUB_RPC_URL,
} from './scarper.constants';
import {IChainRpcUrlPair, IScrapper} from './scraper.interfaces';

export class DefaultChainRpcScrapper implements IScrapper<IChainRpcUrlPair> {
  private httpClient: AxiosInstance;

  constructor(private logger: ILoggerLike) {
    this.httpClient = axios.create({
      baseURL: DEFI_LLAMA_GITHUB_BASE_URL,
    });
  }

  public scrape = async () => this.scrapeRpcUrls();

  private scrapeRpcUrls = async () => {
    const data = await this.scrapeRpcUrlFromUrl(MAIN_RPC_GITHUB_RPC_URL);
    if (data) {
      return data;
    }

    return this.scrapeRpcUrlFromUrl(FALLBACK_RPC_GITHUB_RPC_URL);
  };

  private scrapeRpcUrlFromUrl = async (
    url: string
  ): Promise<IChainRpcUrlPair | null> => {
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

  private transformRpcList = (data: string): IChainRpcUrlPair | null => {
    const regex = /export const extraRpcs = ({[\s\S]*});/;
    const match = data.match(regex);
    if (!match) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
}
