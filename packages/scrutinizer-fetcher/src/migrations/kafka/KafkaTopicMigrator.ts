import {inject, injectable} from 'inversify';
import {infrastructure} from 'scrutinizer-infrastructure';
import {types} from '../../@types';
import {IConfiguration} from '../../configuration';

const DefaultKafkaPartition = 3;
const DefaultReplicationFactor = 3;

@injectable()
export class KafkaTopicMigrator {
  constructor(
    @inject(types.IKafkaClient)
    private kafkaClient: infrastructure.messaging.IKafkaClient,
    @inject(types.IConfiguration)
    private configuration: IConfiguration
  ) {}

  public async migrate(): Promise<void> {
    // Delete all topics
    const allTopics = [
      this.configuration.kafka.topics.blockNumbers.name,
      this.configuration.kafka.topics.confirmed.name,
      this.configuration.kafka.topics.forked.name,
    ];

    const availableTopics = await this.kafkaClient.admin.listTopics();
    const topicsToDelete = availableTopics.filter(topic =>
      allTopics.includes(topic)
    );

    await this.kafkaClient.admin.deleteTopics({
      topics: topicsToDelete,
    });

    // Create all topics
    await this.kafkaClient.admin.createTopics({
      waitForLeaders: true,
      topics: [
        {
          topic: this.configuration.kafka.topics.blockNumbers.name,
          numPartitions: DefaultKafkaPartition,
          replicationFactor: DefaultReplicationFactor,
        },
        {
          topic: this.configuration.kafka.topics.confirmed.name,
          numPartitions: DefaultKafkaPartition,
          replicationFactor: DefaultReplicationFactor,
        },
        {
          topic: this.configuration.kafka.topics.forked.name,
          numPartitions: DefaultKafkaPartition,
          replicationFactor: DefaultReplicationFactor,
        },
      ],
    });
  }
}
