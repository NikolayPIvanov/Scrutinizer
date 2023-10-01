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

CREATE TABLE blocks_main AS
  SELECT `number`,
         LATEST_BY_OFFSET(parentHash) AS parentHash,
         LATEST_BY_OFFSET(hash) AS hash,
         LATEST_BY_OFFSET(`timestamp`) AS `timestamp`
  FROM blocks
  GROUP BY `number`
  EMIT CHANGES;

SELECT *, 'status' as sta FROM blocks_main;

DROP IF EXISTS TABLE TRANSACTION_LATEST;
DROP IF EXISTS TABLE BLOCK_NUMBER_LATEST;
DROP IF EXISTS STREAM LATEST_PROCESSED;
DROP IF EXISTS STREAM MINED_TRANSACTIONS;
DROP IF EXISTS STREAM KSQL_PROCESSING_LOG;
DROP IF EXISTS STREAM BLOCKS;
