# docker exec -it ksqldb-cli ksql http://ksqldb-server:8088

CREATE STREAM `block_numbers` (`blockNumber` int)
  WITH (
    kafka_topic='scrutinizer.block.numbers',
    value_format='json',
    partitions=10);

CREATE STREAM `latest_block_numbers` AS
  SELECT `blockNumber`, 'latest' AS `tag` FROM `block_numbers` EMIT CHANGES;

CREATE TABLE `committed_block_numbers` AS
  SELECT `tag`,
         MAX(`blockNumber`) AS `blockNumber`
  FROM `latest_block_numbers`
  GROUP BY `tag`
  EMIT CHANGES;

DROP STREAM `block_numbers`;
DROP STREAM `latest_block_numbers`;
DROP TABLE `committed_block_numbers`;