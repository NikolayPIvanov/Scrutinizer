export const to = async <T>(
  promise: Promise<T>
): Promise<[T | null, unknown | null]> => {
  try {
    const result = await promise;
    return [result, null];
  } catch (error: unknown | null) {
    return [null, error];
  }
};
