import {inject, injectable} from 'inversify';
import {
  IBlockJob,
  IBlockNumberEmitter,
  IBlockNumberEventHandler,
  IConfiguration,
  IEmitter,
  IKafkaClient,
  ILogger,
  IProvider,
  TYPES,
} from '../../types';
import {constants} from '../constants';

// Possible failures:
// - Node immediate death
//  - We lose block, continue from last processed. Edge case: If 1,2,3 blocks are run in parallel, 2 fails, 3 succeeds, we will continue from 3, skipping 1.(Need to fix).
//      - Is Kafka down? yes, try redis
//      - Is Redis down? yes, we are skipping block for now.
// - Kafka error
//  - Need to store the block somewhere - Redis (OKish)
// - Network error
//  - Retries (OK)

const executeCallback = (job: IBlockJob) => !!job.callback && job.callback();

@injectable()
export class BlockNumberEventHandler implements IBlockNumberEventHandler {
  constructor(
    @inject(TYPES.ILogger) private logger: ILogger,
    @inject(TYPES.IConfiguration) private configuration: IConfiguration,
    @inject(TYPES.IBlockNumberEmitter)
    private blockNumberEmitter: IBlockNumberEmitter,
    @inject(TYPES.IEmitter) private emitter: IEmitter,
    @inject(TYPES.IKafkaClient) private kafka: IKafkaClient,
    @inject(TYPES.IProvider) private provider: IProvider
  ) {
    this.bootstrap();
  }

  private bootstrap = () => {
    this.emitter.instance.on(
      constants.events.newBlock,
      async ({block, retries = 0, callback}: IBlockJob) =>
        this.handle({block, retries, callback})
    );
  };

  private handle = async (job: IBlockJob) => {
    this.logger.info(
      `Received Block ${parseInt(job.block.number, 16)} for processing`
    );

    if (job.block.receipts.length > 0) {
      this.logger.info(
        `Block ${parseInt(job.block.number, 16)} already processed`
      );
    }

    if (Number.isNaN(parseInt(job.block.number, 16))) {
      return executeCallback(job);
    }
    // const [block, error] = await to(this.provider.getBlock(job.blockNumber));
    // if (error || !block) {
    //     return this.scheduleForRetry(job);
    // }

    // const transactionTopicMessagesSet = this.toTransactionMessages(block);

    // const [, err] = await to(this.kafka.producer.sendBatch({
    //     acks: constants.acknowledgements,
    //     topicMessages: [
    //         ...transactionTopicMessagesSet,
    //         {
    //             topic: this.configuration.kafka.topics.blocks,
    //             messages: [this.toBlockMessages(block)]
    //         }
    //     ]
    // }));

    // if (err) {
    //     await this.scheduleForRetry(job);
    // }
  };

  // private scheduleForRetry = async (job: IBlockJob) => {
  //     const error = await this.sendBlockRetry(job);
  //     if (error) {
  //         this.logger.error("Failed to send block for retry!");

  //         // TODO: Store in Redis
  //     }

  //     executeCallback(job);
  // }

  // private sendBlockRetry = async (job: IBlockJob) => {
  //     const { blockNumber, retries } = job;
  //     const [, error] = await to(this.kafka.producer.sendBatch({
  //         acks: constants.kafka.acks,
  //         topicMessages: [
  //             {
  //                 topic: this.configuration.kafka.topics.blocksNumberRetry,
  //                 messages: [{
  //                     value: JSON.stringify({ blockNumber, retries })
  //                 }]
  //             }
  //         ]
  //     }));

  //     return error;
  // }

  // private toTransactionMessages = (block: Block) => {
  //     const splits = splitByBytes<TransactionResponse>(block?.prefetchedTransactions);
  //     return splits.map((split) => {
  //         const messages = split.rows.map(r => ({ value: JSON.stringify(r.toJSON()) }));

  //         return {
  //             messages,
  //             topic: this.configuration.kafka.topics.transactions
  //         }
  //     })
  // }

  // private toBlockMessages = (block: Block) => {
  //     const { transactions, _type, ...baseBlock } = block.toJSON()

  //     return {
  //         value: JSON.stringify(baseBlock)
  //     };
  // }
}
