import {INodeStorageRepository, IRpcNode} from './provider.interfaces';

export class MemoryNodeStorageRepository implements INodeStorageRepository {
  private nodes: Map<string, IRpcNode> = new Map();

  public async findStartNodes(chainId: number): Promise<IRpcNode[]> {
    const nodes = Array.from(this.nodes.values()).filter(
      node =>
        node.chainId === chainId &&
        node.errorCount === 0 &&
        node.rateLimit === 0 &&
        node.latency <= 1000
    );

    return nodes.sort((a, b) => a.latency - b.latency);
  }

  public async findAll(): Promise<IRpcNode[]> {
    return Array.from(this.nodes.values());
  }

  public upsert(node: IRpcNode) {
    this.nodes.set(node.rpcAddress, node);
  }
}
