export interface IDbQueries {
  getLatestCommittedBlockNumber(): Promise<number>;
  getBlocks(after?: number): Promise<IBlockTrace[]>;
}

export interface IBlockTrace {
  number: number;
  hash: string;
  parentHash: string;
}

export interface ILastCommittedRow {
  BLOCKNUMBER: number;
}
