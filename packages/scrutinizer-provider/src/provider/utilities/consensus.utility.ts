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
