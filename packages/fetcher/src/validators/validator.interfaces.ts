export interface IBlockRoot {
  number: number;
  hash: string;
  parentHash: string;
}

export interface IValidator {
  validateChainIntegrity(): Promise<void>;
}
