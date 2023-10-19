import {DefaultProviderFactory} from './DefaultProviderFactory';
import {IProviderFactory} from './factories.interfaces';

export {DefaultEvmApiFactory} from './DefaultEvmApiFactory';
export {DefaultProviderFactory} from './DefaultProviderFactory';
export {IEvmApiFactory} from './factories.interfaces';

export const factory = new DefaultProviderFactory() as IProviderFactory;
