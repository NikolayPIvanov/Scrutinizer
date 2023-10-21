/* eslint-disable node/no-extraneous-import */
import {IProvider} from 'scrutinizer-provider';

export interface ILagCalculatorService {
  initializePeriodicBlockLagCalculation(provider: IProvider): Promise<void>;
}
