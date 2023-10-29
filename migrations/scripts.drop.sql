DROP TABLE IF EXISTS `new_blocks_checkpoint`;
DROP TABLE IF EXISTS `processed_blocks`;
DROP TABLE IF EXISTS `confirmed_blocks_checkpoint` DELETE TOPIC;
DROP STREAM IF EXISTS `new_block_numbers` DELETE TOPIC;
DROP STREAM IF EXISTS `newest_block_number` DELETE TOPIC;
DROP STREAM IF EXISTS `blocks_transactions_logs` DELETE TOPIC;
DROP STREAM IF EXISTS `confirmed_blocks` DELETE TOPIC;
DROP STREAM IF EXISTS `newest_confirmed_block_number` DELETE TOPIC;