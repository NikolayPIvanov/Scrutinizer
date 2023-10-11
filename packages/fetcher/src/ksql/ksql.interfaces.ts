export interface IDbQueries {
  getLatestCommittedBlockNumber(): Promise<number>;
}

export interface ILastCommittedRow {
  BLOCKNUMBER: number;
}
