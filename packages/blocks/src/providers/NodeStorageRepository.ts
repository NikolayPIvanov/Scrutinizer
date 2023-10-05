class MockManager {
    public data: any[] = []

    public find = (options: any | undefined = undefined) => {
        if (!options) {
            return this.data;
        }

        const { where } = options

        return this.data.filter(row => row.chainId === where.chainId &&
            row.errorCount === where.errorCount &&
            row.rateLimit === where.rateLimit &&
            row.latency <= where.latency)
            .sort((a, b) => a.latency - b.latency);
    }
}

class MockDatabase {
    manager: MockManager;
    constructor() {
        this.manager = new MockManager();
    }
}

export class NodeStorageRepository {
    private static instance: NodeStorageRepository;
    private data: MockDatabase = new MockDatabase();

    private constructor() {
    }

    public static async init(): Promise<NodeStorageRepository> {
        if (!NodeStorageRepository.instance) {
            NodeStorageRepository.instance = new NodeStorageRepository();

            await NodeStorageRepository.instance.connect();
        }

        return NodeStorageRepository.instance;
    }

    public static getInstance(): NodeStorageRepository {
        if (!NodeStorageRepository.instance) {
            NodeStorageRepository.instance = new NodeStorageRepository();

            NodeStorageRepository.instance.connect();
        }

        return NodeStorageRepository.instance;
    }

    public async connect() {
    }

    async findStartNodes(chainId: number): Promise<any[]> {
        return this.data.manager.find({
            where: {
                chainId,
                errorCount: 0,
                rateLimit: 0,
                latency: 1000,
            }
        });
    }

    async findAll(): Promise<any[]> {
        return this.data.manager.find();
    }

    async upsert(node: any, update = 0): Promise<void> {
        try {
            const existingIndex = this.data.manager.data.findIndex(row => row.rpcAddress === node.rpcAddress);
            if (existingIndex > -1) {
                this.data.manager.data.splice(existingIndex, 1, node);
            }

        } catch (error) {
            console.log("Node Upsert error", error);

            throw error;
        }
    }
}