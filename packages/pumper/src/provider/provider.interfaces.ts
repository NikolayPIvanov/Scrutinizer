import {ITransformedExtendedRpcInstance} from './scrapers/scraper.interfaces';

export interface IProviderConfigurationMerger {
  mergeConfigurations(): Promise<ITransformedExtendedRpcInstance[]>;
}
