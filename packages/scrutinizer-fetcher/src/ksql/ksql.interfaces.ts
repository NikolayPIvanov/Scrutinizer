export interface IDbQueries {
  getLatestCommittedBlockNumber(): Promise<number>;
  getPreviouslyConfirmedBlockNumber(): Promise<number>;
  getBlocks(after?: number, limit?: number): Promise<IRawBlock[]>;
}

export interface IRawBlock {
  blockNumber: number;
  hash: string;
  parentHash: string;
}

export interface IPreviousBlockNumber {
  blockNumber: number;
}
