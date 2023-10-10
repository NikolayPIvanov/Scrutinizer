import {client} from './KsqldbClient';

export const getLatestCommittedBlockNumber = async (): Promise<number> => {
  const {data, error} = await client.query(
    'SELECT * FROM latest_block_number;'
  );
  if (!data) {
    throw error;
  }

  const {rows} = data;

  if (!rows.length) {
    return 0;
  }

  return rows[0].BLOCKNUMBER;
};
