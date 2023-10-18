/* eslint-disable node/no-extraneous-import */
import {injectable} from 'inversify';
import {ILoggerLike} from '../common';
import {IProvider, IProviderConfigurator} from './provider.interfaces';
import {ITransformedExtendedRpcInstance} from './scrapers';

const maxBlocksPerIteration = 25000;

@injectable()
export class Provider implements IProvider {
  constructor(
    private logger: ILoggerLike,
    private providerConfigurator: IProviderConfigurator
  ) {}
  initialize: (
    providerRpcConfiguration: ITransformedExtendedRpcInstance,
    lastCommitted?: number | undefined
  ) => Promise<void>;

  private constructConsequentArray = (length: number, start: number) => {
    const sequence = [...Array(length)].map((_, i) => start + i + 1);
    this.verifyConsequentArray(sequence, start);

    return sequence;
  };

  private verifyConsequentArray = (arr: number[], pivot: number) => {
    if (arr[0] !== pivot + 1) {
      throw new Error(`Invalid block calculation ${arr.join(', ')}`);
    }
  };

  private sendBlockNumbersToKafka = async (blocks: number[]) => {
    await this.kafkaClient.producer.send({
      compression: CompressionTypes.GZIP,
      topic: this.configuration.kafka.topics.blockNumbers.name,
      messages: blocks.map(block => ({
        key: block.toString(),
        value: JSON.stringify({blockNumber: block}),
      })),
    });

    this.logger.info(`Successfully sent ${blocks.join(' ')} block numbers`);
  };
}
