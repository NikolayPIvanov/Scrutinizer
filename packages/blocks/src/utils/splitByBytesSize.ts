const CHUNK_SIZE = 1;
const MAX_SIZE = 1000000;

export interface IByteSplit<T> {
    rows: T[],
    size: number
};

export const splitByBytes = <T>(entities: T[], maxSize = MAX_SIZE, chunkSize = CHUNK_SIZE): IByteSplit<T>[] => {
    const splits: IByteSplit<T>[] = [];

    for (let i = 0; i < entities.length; i += chunkSize) {
        let size = 0;
        const rows = [];

        do {
            const current = entities.slice(i, i + chunkSize);
            size += new Blob([JSON.stringify(current)]).size

            if (size >= maxSize) {
                break;
            }

            rows.push(...current);
            i += chunkSize;
        } while (size <= maxSize && i < entities.length);

        if (rows.length === 0) {
            throw new Error("Single row is greater than max size.")
        }

        splits.push({
            size,
            rows: rows
        });
    }

    return splits;
}