import {inject, injectable} from 'inversify';
// eslint-disable-next-line node/no-extraneous-import
import {infrastructure} from 'scrutinizer-infrastructure';
import {types} from '../@types';
import {IDbQueries, IPreviousBlockNumber, IRawBlock} from './ksql.interfaces';

@injectable()
export class DbQueries implements IDbQueries {
  constructor(
    @inject(types.IKsqlDb) private ksql: infrastructure.ksql.IKsqldb,
    @inject(types.ILogger) private logger: infrastructure.logging.ILogger
  ) {}

  /**
   * Get the latest committed block number.
   * Called only on start-up.
   * @returns The latest committed block number or 0 if no blocks have been committed yet.
   */
  public async getLatestCommittedBlockNumber(): Promise<number> {
    const {data, error} = await this.ksql.client.query(
      'SELECT * FROM `new_block_numbers`;'
    );
    if (!data) {
      throw error;
    }

    const {rows} = data;

    if (!rows?.length) {
      return 0;
    }

    return (rows[0] as IPreviousBlockNumber).blockNumber;
  }

  public async getPreviouslyConfirmedBlockNumber(): Promise<number> {
    const {data, error} = await this.ksql.client.query(
      'SELECT * FROM `confirmed_blocks_checkpoint`;'
    );
    if (!data) {
      throw error;
    }

    const {rows} = data;

    if (!rows?.length) {
      return 0;
    }

    return (rows[0] as IPreviousBlockNumber).blockNumber;
  }

  /**
   * Used by the validator of the block chain validator to get the blocks to validate.
   * @param after - The block number to start from. If not provided, all blocks are returned.
   * @returns The blocks after the provided block number or all blocks if no block number is provided.
   */
  public async getBlocks(after?: number, limit = 10000): Promise<IRawBlock[]> {
    const query = after
      ? 'SELECT * FROM `processed_blocks` WHERE `blockNumber` > ' + after
      : 'SELECT * FROM `processed_blocks`';
    const limitQuery = `${query} LIMIT ${limit};`;

    const {data, error} = await this.ksql.client.query(limitQuery);
    if (!data) {
      throw error;
    }

    return data.rows?.map((row: unknown) => row as IRawBlock) || [];
  }

  public async execute(statement: string): Promise<void> {
    try {
      const response = await this.ksql.client.executeStatement(statement);

      this.logger.info(JSON.stringify(response.error?.message, null, 2));
    } catch (error) {
      this.logger.error(error);
    }
  }
}
