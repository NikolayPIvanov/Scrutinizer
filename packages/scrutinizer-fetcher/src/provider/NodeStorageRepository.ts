import Database = require('better-sqlite3');
import {injectable} from 'inversify';
import {DataSource, LessThanOrEqual} from 'typeorm';
import {INodeStorageRepository} from './provider.interfaces';

@injectable()
export class NodeStorageRepository implements INodeStorageRepository {
  private data!: DataSource;
  private nativeDb!: Database.Database;

  public async init() {
    await this.connect();
  }

  public async findStartNodes(chainId: number): Promise<RpcNodes[]> {
    return this.data.manager.find(RpcNodes, {
      where: {
        chainId,
        errorCount: 0,
        rateLimit: 0,
        latency: LessThanOrEqual(1000),
      },
      order: {latency: 'ASC'},
    });
  }

  public async findAll(): Promise<RpcNodes[]> {
    return this.data.manager.find(RpcNodes);
  }

  public upsert(node: RpcNodes, update = 0) {
    if (update === 0) {
      const insertQuery = this.nativeDb.prepare(`
        REPLACE INTO rpc_nodes (chainName, chainId, rpcAddress, totalRequest, successRate, latency, errorCount, rateLimit)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertQuery.run(
        node.chainName,
        node.chainId,
        node.rpcAddress,
        node.totalRequest,
        node.successRate,
        node.latency,
        node.errorCount,
        node.rateLimit
      );
    }
  }

  private async connect() {
    this.data = new DataSource({
      type: 'better-sqlite3',
      database: 'nodeStore.sqlite',
      entities: [RpcNodes],
      synchronize: true,
    });

    await this.data.initialize();
    this.nativeDb = new Database('nodeStore.sqlite');
  }
}
