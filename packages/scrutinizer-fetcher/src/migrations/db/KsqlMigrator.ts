import {inject, injectable} from 'inversify';
import {types} from '../../@types';
import {IDbQueries} from '../../ksql';

enum MigrationType {
  TABLE = 0,
  STREAM,
}

// docker exec -it ksqldb-cli ksql http://ksqldb-server:8088
const Migrations = [
  {
    up: `
        CREATE STREAM IF NOT EXISTS \`new_block_numbers\` (\`blockNumber\` int)
        WITH (
            kafka_topic='scrutinizer.block.numbers',
            value_format='json',
            partitions=3);
        `,
    down: 'DROP STREAM IF EXISTS `new_block_numbers` ;',
    type: MigrationType.STREAM,
    weight: 1,
  },
  {
    up: `
        CREATE STREAM IF NOT EXISTS \`newest_block_number\` AS
            SELECT \`blockNumber\`, 'new' AS \`tag\` FROM \`new_block_numbers\` EMIT CHANGES;
        `,
    down: 'DROP STREAM IF EXISTS `newest_block_number` ;',
    type: MigrationType.STREAM,
    weight: 2,
  },
  {
    up: `
        CREATE TABLE IF NOT EXISTS \`new_blocks_checkpoint\` AS
            SELECT \`tag\`,
                    MAX(\`blockNumber\`) AS \`blockNumber\`
            FROM \`newest_block_number\`
            GROUP BY \`tag\`
            EMIT CHANGES;
        `,
    down: 'DROP TABLE IF EXISTS `new_blocks_checkpoint`;',
    type: MigrationType.TABLE,
    weight: 3,
  },
  {
    up: `
        CREATE IF NOT EXISTS STREAM \`blocks_transactions_logs\` (
            baseFeePerGas varchar,
            difficulty varchar,
            extraData varchar,
            gasLimit varchar,
            gasUsed varchar,
            hash varchar,
            miner varchar,
            nonce varchar,
            \`blockNumber\` int,
            parentHash varchar,
            \`blockTimestamp\` int
            )
        WITH (
            kafka_topic='scrutinizer.full.blocks',
            value_format='json',
            partitions=3);
        `,
    down: 'DROP STREAM IF EXISTS `blocks_transactions_logs` ;',
    type: MigrationType.STREAM,
    weight: 1,
  },
  {
    up: `
        CREATE TABLE IF NOT EXISTS \`processed_blocks\` AS
            SELECT \`blockNumber\`,
                    LATEST_BY_OFFSET(parentHash) AS \`parentHash\`,
                    LATEST_BY_OFFSET(hash) AS \`hash\`,
                    LATEST_BY_OFFSET(\`blockTimestamp\`) AS \`timestamp\`
            FROM \`blocks_transactions_logs\`
            GROUP BY \`blockNumber\`
            EMIT CHANGES;
        `,
    down: 'DROP TABLE IF EXISTS `processed_blocks`;',
    type: MigrationType.TABLE,
    weight: 3,
  },
  {
    up: `
        CREATE STREAM IF NOT EXISTS \`confirmed_blocks\` (\`blockNumber\` int)
        WITH (
            kafka_topic='scrutinizer.confirmed.blocks',
            value_format='json',
            partitions=3);
        `,
    down: 'DROP STREAM IF EXISTS `confirmed_blocks` ;',
    type: MigrationType.STREAM,
    weight: 1,
  },
  {
    up: `
        CREATE STREAM IF NOT EXISTS \`newest_confirmed_block_number\` AS
            SELECT \`blockNumber\`, 'committed' AS \`tag\` FROM \`confirmed_blocks\` EMIT CHANGES;
        `,
    down: 'DROP STREAM IF EXISTS `newest_confirmed_block_number` ;',
    type: MigrationType.STREAM,
    weight: 2,
  },
  {
    up: `
        CREATE TABLE IF NOT EXISTS \`confirmed_blocks_checkpoint\` AS
            SELECT \`tag\`,
                    MAX(\`blockNumber\`) AS \`blockNumber\`
            FROM \`newest_confirmed_block_number\`
            GROUP BY \`tag\`
            EMIT CHANGES;
        `,
    down: 'DROP TABLE IF EXISTS `confirmed_blocks_checkpoint` ;',
    type: MigrationType.TABLE,
    weight: 3,
  },
];

@injectable()
export class KsqlMigrator {
  constructor(
    @inject(types.IDbQueries)
    private queries: IDbQueries
  ) {}

  public async migrate(): Promise<void> {
    const migrations = [...Migrations];

    migrations.sort((a, b) => b.weight - a.weight);
    // Delete tables & streams
    await Promise.all(
      migrations.map(migration => this.queries.execute(migration.down))
    );

    // Create streams & tables
    for await (const migration of Migrations) {
      await this.queries.execute(migration.up);
    }
  }
}
