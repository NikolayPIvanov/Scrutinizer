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