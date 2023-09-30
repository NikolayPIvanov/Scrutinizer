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