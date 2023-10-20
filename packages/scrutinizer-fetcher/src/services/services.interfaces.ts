import {IProvider} from 'scrutinizer-provider';

export interface IBlockRoot {
  number: number;
  hash: string;
  parentHash: string;
}

export interface IValidatorService {
  validateChainIntegrity(): Promise<void>;
}

export interface ILagCalculatorService {
  initializePeriodicBlockLag(provider: IProvider): Promise<void>;
}
