// import KsqldbClient from "ksqldb-client";

const KsqldbClient = require("ksqldb-client")

export const client = new KsqldbClient({
    host: "http://localhost",
    port: 8088,
});


export let initialized = false;
export const bootstrap = async () => {
    await client.connect();

    initialized = true;
}