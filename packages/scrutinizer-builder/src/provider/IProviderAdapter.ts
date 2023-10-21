/* eslint-disable node/no-extraneous-import */
import {IProvider} from 'scrutinizer-provider';

export interface IProviderAdapter {
  getInstance(): Promise<IProvider>;
}
