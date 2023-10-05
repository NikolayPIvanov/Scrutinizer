import { client } from "./KsqldbClient";

export const getLastProcessedBlockNumber = async () => {
    const { data, error } = await client.query("SELECT * FROM block_number_latest;");
    if (!data) {
        return null;
    }

    const { rows } = data;

    if (!rows.length) return null;

    return rows[0].number;
}

export const getBlocks = async (after: number) => {
    const { data, error } = await client.query(
        `SELECT * FROM blocks_main ${!!after ? 'WHERE `timestamp`' + ` > ${after}` : ''} LIMIT 1000;`);
    if (!data) {
        return null;
    }

    const { rows } = data;

    return rows as any[];
}
