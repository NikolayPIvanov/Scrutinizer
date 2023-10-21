export interface IDbQueries {
  getLatestCommittedBlockNumber(): Promise<number>;
  getBlocks(after?: number, limit?: number): Promise<IRawBlock[]>;
}

export interface IRawBlock {
  blockNumber: number;
  hash: string;
  parentHash: string;
}

export interface ILastCommittedBlockNumber {
  blockNumber: number;
}
