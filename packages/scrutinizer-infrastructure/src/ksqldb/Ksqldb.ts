import {ClientOptions, IKsqldbClient} from './ksqldb.interfaces';

const KsqldbClient = require('ksqldb-client');

export interface IKsqldb {
  client: IKsqldbClient;
}

export class Ksqldb implements IKsqldb {
  public client: IKsqldbClient = {} as IKsqldbClient;

  constructor({
    host = 'http://localhost',
    port = 8088,
    ...options
  }: ClientOptions) {
    this.client = new KsqldbClient({
      host,
      port,
      ...options,
    }) as IKsqldbClient;
  }

  public async connect() {
    await this.client.connect();
  }
}
