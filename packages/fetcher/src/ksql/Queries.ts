import {inject, injectable} from 'inversify';
// eslint-disable-next-line node/no-extraneous-import
import {infrastructure} from 'scrutinizer-infrastructure';
import {TYPES} from '../injection/types';
import {IDbQueries, ILastCommittedRow} from './ksql.interfaces';

@injectable()
export class DbQueries implements IDbQueries {
  constructor(
    @inject(TYPES.IKsqlDb) private ksql: infrastructure.ksql.IKsqldb
  ) {}

  async getLatestCommittedBlockNumber(): Promise<number> {
    const {data, error} = await this.ksql.client.query(
      'SELECT * FROM latest_block_number;'
    );
    if (!data) {
      throw error;
    }

    const {rows} = data;

    if (!rows?.length) {
      return 0;
    }

    return (rows[0] as ILastCommittedRow).BLOCKNUMBER;
  }
}
