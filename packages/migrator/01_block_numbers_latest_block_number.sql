# docker exec -it ksqldb-cli ksql http://ksqldb-server:8088

# Pumping data from Kafka to KSQLDB
CREATE STREAM block_numbers (blockNumber int)
  WITH (
    kafka_topic='scrutinizer.next.blocks',
    value_format='json',
    partitions=3);

CREATE STREAM latest_block_numbers AS
  SELECT blockNumber, 'latest' AS tag FROM block_numbers EMIT CHANGES;

CREATE TABLE latest_block_number AS
  SELECT tag,
         MAX(blockNumber) AS blockNumber
  FROM latest_block_numbers
  GROUP BY tag
  EMIT CHANGES;
