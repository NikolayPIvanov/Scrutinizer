import { bootstrap as bootstrapBlockNumberEventHandler } from './handlers/blockNumber/BlockNumberEventHandler';
import { bootstrap as bootstrapKafka } from './messaging/Kafka';
import { bootstrap as bootstrapTransactionConsumer } from "./messaging/TransactionConsumer";
import { bootstrap as bootstrapBlocksRetryConsumer } from "./messaging/BlocksRetryConsumer";
import { bootstrap as bootstrapKsqldb } from './ksql/KsqldbClient';
import { getLastProcessedBlockNumber } from './ksql/Queries';
import { subscribeOnBlockEvent } from './websockets';
import { indexMissingBlocksFrom } from './indexing';


(async () => {
    await Promise.all([bootstrapKsqldb(), bootstrapKafka()]);
    await Promise.all([bootstrapTransactionConsumer(), bootstrapBlocksRetryConsumer()]);

    bootstrapBlockNumberEventHandler();

    const lastProcessedBlockNumber = await getLastProcessedBlockNumber();

    // TODO: Rework this to be with RPC calls on a given time period.
    // If we get many blocks at once, the middle one may fail.
    // The send to Kafka might fail as well, this will result in missed block.
    // The fail may be something like too large message over 1MB.
    subscribeOnBlockEvent();

    await indexMissingBlocksFrom(lastProcessedBlockNumber);
})();
