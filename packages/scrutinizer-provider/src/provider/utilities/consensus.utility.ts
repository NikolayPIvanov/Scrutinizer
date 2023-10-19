import {IFullJsonRpcBlock} from '../provider.interfaces';

export const getConsensusValue = (numbers: number[]): number => {
  if (numbers.length === 0) {
    throw new Error('Cannot get consensus value of empty array');
  }

  return getConsensus(numbers);
};

const getConsensus = (numbers: number[]): number => {
  const frequency = new Map<number, number>();

  let maxCount = 0;
  let consensusValue = 0;
  for (const value of numbers) {
    const count = frequency.get(value) || 0;
    frequency.set(value, count + 1);

    if (count + 1 > maxCount) {
      maxCount = count + 1;
      consensusValue = value;
    }
  }

  return consensusValue;
};

export const getBlockConsensusValue = (
  blocks: IFullJsonRpcBlock[]
): IFullJsonRpcBlock | undefined => {
  const frequency = new Map();

  if (blocks.length === 0) {
    throw new Error('Cannot get consensus value of empty array');
  }

  let maxCount = 0;
  let consensusValue: IFullJsonRpcBlock | undefined;

  for (const block of blocks) {
    if (block?.hash === undefined) {
      continue;
    }

    const count = frequency.get(block.hash) || 0;
    frequency.set(block.hash, count + 1);

    if (count + 1 > maxCount) {
      maxCount = count + 1;
      consensusValue = block;
    }
  }

  return consensusValue;
};
