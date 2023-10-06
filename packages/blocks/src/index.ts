import { bootstrap, container } from './di/container';
// import { bootstrap as bootstrapKafka } from './messaging/Kafka';
// import { bootstrap as bootstrapTransactionConsumer } from "./messaging/TransactionConsumer";
// import { bootstrap as bootstrapBlocksRetryConsumer } from "./messaging/BlocksRetryConsumer";
import { bootstrap as bootstrapKsqldb } from './ksql/KsqldbClient';
import { getLastProcessedBlockNumber } from './ksql/Queries';

// import { indexMissingBlocksFrom } from './indexing';
import {IKafkaClient, ILogger, IProvider, IScrapper, TYPES} from './types';

/**
 * 1. WebSockets subscribe - this will give us the data at near real-time. (WS)
 * 2. Emit event to store the block number. (DB)
 * 3. Get Block data (HTTP)
 * 4. Send Block and data to Kafka (KAFKA)
 */
(async () => {
  bootstrap();

  const logger = container.get<ILogger>(TYPES.ILogger);
  const chainService = container.get<IScrapper<any>>(TYPES.IChainListScrapper);
  const kafka = container.get<IKafkaClient>(TYPES.IKafkaClient);
  const provider = container.get<IProvider>(TYPES.IProvider);

  const providerRpcConfigurations = await chainService.scrape();
  logger.info(providerRpcConfigurations);

  await provider.initialize(providerRpcConfigurations[0]);

  await Promise.all([bootstrapKsqldb(), kafka.bootstrap()]);
  // await Promise.all([bootstrapTransactionConsumer(), bootstrapBlocksRetryConsumer()]);

  const lastProcessedBlockNumber = await getLastProcessedBlockNumber();

  // await indexMissingBlocksFrom(lastProcessedBlockNumber);
})();
