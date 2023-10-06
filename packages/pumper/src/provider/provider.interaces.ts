export interface IProviderConfigurationMerger {
  mergeConfigurations(): Promise<unknown>;
}
