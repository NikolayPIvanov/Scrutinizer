export const to = async <T>(promise: Promise<T>): Promise<[T | null, unknown]> => {
    try {
        const result = await promise;
        return [result, null];
    } catch (error) {
        return [null, error];
    }
};
