export interface IDbQueries {
  getLatestCommittedBlockNumber(): Promise<number>;
  getPreviouslyConfirmedBlockNumber(): Promise<number>;
  execute(statement: string): Promise<void>;
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
