export interface IBlockRoot {
  number: number;
  hash: string;
  parentHash: string;
}

export interface IValidatorService {
  validateChainIntegrity(): Promise<void>;
}
