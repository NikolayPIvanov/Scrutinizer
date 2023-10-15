import {inject, injectable} from 'inversify';
// eslint-disable-next-line node/no-extraneous-import
import {infrastructure} from 'scrutinizer-infrastructure';
import {TYPES} from '../injection/types';
import {
  IBlockTrace,
  IDbQueries,
  ILastCommittedRow,
  IRawBlock,
} from './ksql.interfaces';

@injectable()
export class DbQueries implements IDbQueries {
  constructor(
    @inject(TYPES.IKsqlDb) private ksql: infrastructure.ksql.IKsqldb
  ) {}

  /**
   * Get the latest committed block number.
   * Called only on start-up.
   * @returns The latest committed block number or 0 if no blocks have been committed yet.
   */
  public async getLatestCommittedBlockNumber(): Promise<number> {
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

  /**
   * Used by the validator of the block chain validator to get the blocks to validate.
   * @param after - The block number to start from. If not provided, all blocks are returned.
   * @returns The blocks after the provided block number or all blocks if no block number is provided.
   */
  public async getBlocks(after?: number): Promise<IBlockTrace[]> {
    const query = after
      ? `SELECT * FROM blocks_traces WHERE BLOCKNUMBER > ${after};`
      : 'SELECT * FROM blocks_traces;';

    const {data, error} = await this.ksql.client.query(query);
    if (!data) {
      throw error;
    }

    const {rows} = data;

    return (rows?.map((row: unknown) => {
      const {blockNumber, hash, parentHash} = row as IRawBlock;
      return {number: blockNumber, hash, parentHash};
    }) || []) as IBlockTrace[];
  }
}
