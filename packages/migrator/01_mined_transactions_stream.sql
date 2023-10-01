CREATE STREAM mined_transactions (
  blockNumber int,
  chainId int,
  blockHash varchar,
  data varchar,
  hash varchar,
  value varchar,
  `from` varchar,
  `to` varchar,
  type int,
  nonce int,
  gasLimit int
  )
  WITH (
    kafka_topic='transactions',
    value_format='json',
    partitions=3);


CREATE TABLE transaction_latest AS
  SELECT hash,
         LATEST_BY_OFFSET(blockNumber) AS blockNumber,
         LATEST_BY_OFFSET(blockHash) AS blockHash,
         LATEST_BY_OFFSET(chainId) AS chainId,
         LATEST_BY_OFFSET(data) AS data,
         LATEST_BY_OFFSET(value) AS value,
         LATEST_BY_OFFSET(`from`) AS `from`,
         LATEST_BY_OFFSET(`to`) AS `to`,
         LATEST_BY_OFFSET(type) AS type,
         LATEST_BY_OFFSET(nonce) AS nonce,
         LATEST_BY_OFFSET(gasLimit) AS gasLimit
  FROM mined_transactions
  GROUP BY hash
  EMIT CHANGES;

SELECT * FROM transaction_latest;

/*
{
	"baseFeePerGas": "6990681193",
	"difficulty": "0",
	"extraData": "0x546974616e2028746974616e6275696c6465722e78797a29",
	"gasLimit": "30000000",
	"gasUsed": "10006210",
	"hash": "0x520566e4c4560b8da97de0015e934987cb261fbbff4369b76e5e385c30b056e4",
	"miner": "0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97",
	"nonce": "0x0000000000000000",
	"number": 18253970,
	"parentHash": "0xb03114af51cb73f5d2ff6a254ba7eb4417a18ab0d709b0723590404234c7c637",
	"timestamp": 1696142555
}
*/
CREATE STREAM blocks (
  baseFeePerGas varchar,
  difficulty varchar,
  extraData varchar,
  gasLimit varchar,
  gasUsed varchar,
  hash varchar,
  miner varchar,
  nonce varchar,
  `number` int,
  parentHash varchar,
  `timestamp` int
  )
  WITH (
    kafka_topic='blocks',
    value_format='json',
    partitions=3);

CREATE STREAM derived AS
  SELECT `number`, 'latest' AS la FROM blocks EMIT CHANGES;

CREATE TABLE block_number_latest AS
  SELECT la,
         LATEST_BY_OFFSET(`number`) AS `number`
  FROM derived
  GROUP BY la
  EMIT CHANGES;

SELECT * FROM block_number_latest;

CREATE TABLE blocks_main AS
  SELECT `number`,
         LATEST_BY_OFFSET(parentHash) AS parentHash,
         LATEST_BY_OFFSET(hash) AS hash,
         LATEST_BY_OFFSET(`timestamp`) AS `timestamp`
  FROM blocks
  GROUP BY `number`
  EMIT CHANGES;

SELECT *, 'status' as sta FROM blocks_main;
