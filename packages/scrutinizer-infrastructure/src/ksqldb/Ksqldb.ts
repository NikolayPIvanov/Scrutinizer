import {injectable} from 'inversify';
import {ClientOptions, IKsqldb, IKsqldbClient} from './ksqldb.interfaces';

const KsqldbClient = require('ksqldb-client');

@injectable()
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
