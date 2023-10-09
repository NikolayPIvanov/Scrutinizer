# docker exec -it ksqldb-cli ksql http://ksqldb-server:8088

CREATE STREAM blocks_full (
  baseFeePerGas varchar,
  difficulty varchar,
  extraData varchar,
  gasLimit varchar,
  gasUsed varchar,
  hash varchar,
  miner varchar,
  nonce varchar,
  `number` varchar,
  parentHash varchar,
  `timestamp` varchar
  )
  WITH (
    kafka_topic='scrutinizer.full.blocks',
    value_format='json',
    partitions=10);

CREATE TABLE blocks_unconfirmed_trace AS
  SELECT `number`,
         LATEST_BY_OFFSET(parentHash) AS parentHash,
         LATEST_BY_OFFSET(hash) AS hash,
         LATEST_BY_OFFSET(`timestamp`) AS `timestamp`
  FROM blocks_full
  GROUP BY `number`
  EMIT CHANGES;








CREATE STREAM blocks_full (
  hash varchar,
  parentHash varchar,
  `number` varchar,
  `timestamp` varchar
)
WITH (
  kafka_topic='scrutinizer.full.blocks',
  value_format='json',
  partitions=10);

CREATE TABLE blocks_main AS
  SELECT `number`,
         LATEST_BY_OFFSET(parentHash) AS parentHash,
         LATEST_BY_OFFSET(hash) AS hash,
         LATEST_BY_OFFSET(`timestamp`) AS `timestamp`
  FROM blocks
  GROUP BY `number`
  EMIT CHANGES;


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

CREATE STREAM latest_processed AS
  SELECT `number`, 'latest' AS la FROM blocks EMIT CHANGES;

CREATE TABLE block_number_latest AS
  SELECT la,
         LATEST_BY_OFFSET(`number`) AS `number`
  FROM latest_processed
  GROUP BY la
  EMIT CHANGES;

SELECT * FROM block_number_latest;

INSERT INTO latest_processed (la,  `number`) VALUES ('latest', 136530202);

CREATE TABLE blocks_main AS
  SELECT `number`,
         LATEST_BY_OFFSET(parentHash) AS parentHash,
         LATEST_BY_OFFSET(hash) AS hash,
         LATEST_BY_OFFSET(`timestamp`) AS `timestamp`
  FROM blocks
  GROUP BY `number`
  EMIT CHANGES;

SELECT * FROM blocks_main WHERE `number` = 136410379;

CREATE STREAM RECEIPTS (
  blockHash varchar,
  transactionHash varchar,
  status varchar,
  cumulativeGasUsed varchar,
  effectiveGasPrice varchar,
  type varchar,
  logs ARRAY<STRUCT<address varchar,
                    data varchar,
                    blockNumber varchar,
                    transactionHash varchar,
                    removed boolean,
                    `topics` ARRAY<varchar>>>
  )
  WITH (
    kafka_topic='receipts',
    value_format='json',
    partitions=3);

CREATE STREAM transaction_receipts AS
  SELECT
    t.blockNumber as `blockNumber`,
    t.chainId as `chainId`,
    t.blockHash as `blockHash`,
    r.status as `status`,
    r.logs as `logs`,
    r.cumulativeGasUsed as `cumulativeGasUsed`,
    r.effectiveGasPrice as `effectiveGasPrice`,
    r.type as `type`,
    t.nonce as `nonce`,
    t.gasLimit as `gasLimit`,
    t.`from` as `from`,
    t.`to` as `to`,
    t.data as `data`,
    t.value as `value`
  FROM RECEIPTS AS r
  JOIN mined_transactions AS t WITHIN 60 MINUTES GRACE PERIOD 15 MINUTES
  ON r.transactionHash = t.hash EMIT CHANGES;

CREATE TABLE transaction_receipts_final AS
  SELECT hash,
         LATEST_BY_OFFSET(`blockNumber`) AS `blockNumber`,
         LATEST_BY_OFFSET(`blockHash`) AS `blockHash`,
         LATEST_BY_OFFSET(`chainId`) AS `chainId`,
         LATEST_BY_OFFSET(`data`) AS `data`,
         LATEST_BY_OFFSET(`value`) AS `value`,
         LATEST_BY_OFFSET(`from`) AS `from`,
         LATEST_BY_OFFSET(`to`) AS `to`,
         LATEST_BY_OFFSET(`type`) AS `type`,
         LATEST_BY_OFFSET(`nonce`) AS `nonce`,
         LATEST_BY_OFFSET(`gasLimit`) AS `gasLimit`,
         LATEST_BY_OFFSET(`status`) AS `status`,
         LATEST_BY_OFFSET(`logs`) AS `logs`,
         LATEST_BY_OFFSET(`cumulativeGasUsed`) AS `cumulativeGasUsed`,
         LATEST_BY_OFFSET(`effectiveGasPrice`) AS `effectiveGasPrice`
  FROM transaction_receipts
  GROUP BY hash
  EMIT CHANGES;

DROP STREAM IF EXISTS transaction_receipts;
DROP STREAM IF EXISTS RECEIPTS;
DROP TABLE IF EXISTS transaction_receipts_final;
/**
{
	"blockHash": "0x39fc2a33df0cdf6da57ba3efb195d015c57028fac4f060f630baa5f6bbf837d6",
	"blockNumber": "0x821651f",
	"contractAddress": null,
	"cumulativeGasUsed": "0xc65e8",
	"effectiveGasPrice": "0x750b610",
	"from": "0xf5e3aa7fb00056ccedc4efcfa56cab31fc14c712",
	"gasUsed": "0x5c463",
	"gasUsedForL1": "0x3f121",
	"l1BlockNumber": "0x1168c8b",
	"logs": [
		{
			"address": "0xcbd22a0170bd2f642aba5b91b75ac95945368199",
			"topics": [
				"0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
				"0x0000000000000000000000000000000000000000000000000000000000000000",
				"0x000000000000000000000000f5e3aa7fb00056ccedc4efcfa56cab31fc14c712",
				"0x0000000000000000000000000000000000000000000000000000000000000692"
			],
			"data": "0x",
			"blockNumber": "0x821651f",
			"transactionHash": "0x242b221fe35034cc9d1d76a18421f294620ceff8422ac1775bcaad6d65717627",
			"transactionIndex": "0x3",
			"blockHash": "0x39fc2a33df0cdf6da57ba3efb195d015c57028fac4f060f630baa5f6bbf837d6",
			"logIndex": "0x2",
			"removed": false
		},
		{
			"address": "0x9e6ef7f75ad88d4edb4c9925c94b769c5b0d6281",
			"topics": [
				"0x055a181b27c0ef897e8c559755721e45a372d5ac946a2ae3905b8a4364e8745b"
			],
			"data": "0x000000000000000000000000000000000000000000000000000000000003946e000000000000000000000000000000000000000000000000000000000cd17dcd0000000000000000000000000000000000000000000000000000000000000692000000000000000000000000cbd22a0170bd2f642aba5b91b75ac95945368199000000000000000000000000f5e3aa7fb00056ccedc4efcfa56cab31fc14c712",
			"blockNumber": "0x821651f",
			"transactionHash": "0x242b221fe35034cc9d1d76a18421f294620ceff8422ac1775bcaad6d65717627",
			"transactionIndex": "0x3",
			"blockHash": "0x39fc2a33df0cdf6da57ba3efb195d015c57028fac4f060f630baa5f6bbf837d6",
			"logIndex": "0x3",
			"removed": false
		}
	],
	"logsBloom": "0x000000000000000000000001000000000000000000000000300000000000000000000000000000000000000000000000000000000000000000000c0000000080000000000000000010000008000000000000000000000000000000000000000000000000021000000000082000000800000000000000000000000010000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000020000000000000000008000002000004000000000000000000040000000000000000",
	"status": "0x1",
	"to": "0x9e6ef7f75ad88d4edb4c9925c94b769c5b0d6281",
	"transactionHash": "0x242b221fe35034cc9d1d76a18421f294620ceff8422ac1775bcaad6d65717627",
	"transactionIndex": "0x3",
	"type": "0x2"
}

*/

DROP IF EXISTS TABLE TRANSACTION_LATEST;
DROP IF EXISTS TABLE BLOCK_NUMBER_LATEST;
DROP IF EXISTS STREAM LATEST_PROCESSED;
DROP IF EXISTS STREAM MINED_TRANSACTIONS;
DROP IF EXISTS STREAM KSQL_PROCESSING_LOG;
DROP IF EXISTS STREAM BLOCKS;
