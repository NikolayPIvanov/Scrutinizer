import axios, {AxiosInstance} from 'axios';
import {inject, injectable} from 'inversify';
import {to} from '../../common';
import {TYPES} from '../../types';
import {
  DEFI_LLAMA_GITHUB_BASE_URL,
  FALLBACK_GITHUB_RPC_URL,
  MAIN_GITHUB_RPC_URL,
} from './scarper.constants';

import {ILogger} from '../../logger';
import {IChainIdNamePair, IScrapper} from './scraper.interfaces';

@injectable()
export class ChainIdScrapper implements IScrapper<IChainIdNamePair> {
  private httpClient: AxiosInstance;

  constructor(@inject(TYPES.ILogger) private logger: ILogger) {
    this.httpClient = axios.create({
      baseURL: DEFI_LLAMA_GITHUB_BASE_URL,
    });
  }

  public scrape = async () => this.scrapeChainIds();

  private scrapeChainIds = async () => {
    const data = await this.scrapeChainIdsFromUrl(MAIN_GITHUB_RPC_URL);
    if (data) {
      return data;
    }

    return this.scrapeChainIdsFromUrl(FALLBACK_GITHUB_RPC_URL);
  };

  private scrapeChainIdsFromUrl = async (url: string) => {
    const [response, error] = await to(
      this.httpClient.get<IChainIdNamePair>(url)
    );
    if (response?.data) {
      return response.data;
    }

    this.logger.error(error);

    return null;
  };
}
