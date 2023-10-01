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

    subscribeOnBlockEvent();

    await indexMissingBlocksFrom(lastProcessedBlockNumber);
})();
