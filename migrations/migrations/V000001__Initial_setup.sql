CREATE STREAM IF NOT EXISTS `new_block_numbers` (`blockNumber` int)
        WITH (
            kafka_topic='scrutinizer.block.numbers',
            value_format='json',
            partitions=3);

CREATE STREAM IF NOT EXISTS `newest_block_number` AS
            SELECT `blockNumber`, 'new' AS `tag` FROM `new_block_numbers` EMIT CHANGES;

 CREATE TABLE IF NOT EXISTS `new_blocks_checkpoint` AS
            SELECT `tag`,
                    MAX(`blockNumber`) AS `blockNumber`
            FROM `newest_block_number`
            GROUP BY `tag`
            EMIT CHANGES;

CREATE STREAM IF NOT EXISTS `blocks_transactions_logs` (
            baseFeePerGas varchar,
            difficulty varchar,
            extraData varchar,
            gasLimit varchar,
            gasUsed varchar,
            hash varchar,
            miner varchar,
            nonce varchar,
            `blockNumber` int,
            parentHash varchar,
            `blockTimestamp` int
            )
        WITH (
            kafka_topic='scrutinizer.full.blocks',
            value_format='json',
            partitions=3);

CREATE TABLE IF NOT EXISTS `processed_blocks` AS
            SELECT `blockNumber`,
                    LATEST_BY_OFFSET(parentHash) AS `parentHash`,
                    LATEST_BY_OFFSET(hash) AS `hash`,
                    LATEST_BY_OFFSET(`blockTimestamp`) AS `timestamp`
            FROM `blocks_transactions_logs`
            GROUP BY `blockNumber`
            EMIT CHANGES;

CREATE STREAM IF NOT EXISTS `confirmed_blocks` (`blockNumber` int)
        WITH (
            kafka_topic='scrutinizer.confirmed.blocks',
            value_format='json',
            partitions=3);

CREATE STREAM IF NOT EXISTS `newest_confirmed_block_number` AS
            SELECT `blockNumber`, 'committed' AS `tag` FROM `confirmed_blocks` EMIT CHANGES;

CREATE TABLE IF NOT EXISTS `confirmed_blocks_checkpoint` AS
            SELECT `tag`,
                    MAX(`blockNumber`) AS `blockNumber`
            FROM `newest_confirmed_block_number`
            GROUP BY `tag`
            EMIT CHANGES;