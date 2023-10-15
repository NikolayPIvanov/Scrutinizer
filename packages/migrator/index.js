const KsqldbClient = require("ksqldb-client");

const client = new KsqldbClient({
  host: "localhost",
  port: 8088,
});

(async () => {
  await client.connect();
  const { data, error } = await client.query("SELECT * FROM blocks_traces;");
  if (!data) {
    console.log(error);

    throw error;
  }

  const { rows } = data;

  const transformed = rows
    .map(({ number, PARENTHASH, HASH, timestamp }) => ({
      number: parseInt(number),
      parentHash: PARENTHASH,
      hash: HASH,
      timestamp: parseInt(timestamp, 16),
    }))
    .filter((block) => block.number > 48704477);

  transformed.sort((a, b) => a.number - b.number);

  for (let i = transformed.length - 1; i > 0; i--) {
    const currentBlock = transformed[i];
    const previousBlock = transformed[i - 1];
    const consecutive = currentBlock.number - 1 === previousBlock.number;
    const chainUnlinked = currentBlock.parentHash !== previousBlock.hash;
    if (consecutive && chainUnlinked) {
      console.log(`Block ${currentBlock.number} is unlinked`);
    }

    if (!consecutive) {
      console.log(
        `Block ${currentBlock.number} is not consecutive with ${previousBlock.number}`
      );
    }
  }

  console.log("Done");
})();
