import { Host, Keystore, Log, Network, Operation, Plugin, SecretStorage, ShieldPreparation, Storage } from "@kohaku-eth/plugins";
import { AccountId, accountIdToAddress, AssetID } from "node_modules/@kohaku-eth/plugins/src/types";
import { createRailgunAccount, createRailgunIndexer, getNetworkConfig, Indexer, IndexerConfig, RailgunAccount, RailgunAccountParameters } from "@kohaku-eth/railgun";
import { Address, createPublicClient, custom, PublicClient } from "viem";
import { EIP1193ProviderAdapter } from "./provider-adapter";
import { derivePathsForIndex } from "./wallet-node";
import { TxData } from "@kohaku-eth/provider";
import { HostStorageAdapter } from "./storage-adaopter";

const CHAIN_ID_STORAGE_KEY = "railgun-chain-id";
const ACCOUNT_INDEX_STORAGE_KEY = "railgun-account-index";
const INDEXER_CACHE_STORAGE_KEY = "railgun-indexer-cache";
const ACCOUNT_CACHE_STORAGE_KEY = "railgun-account-cache";
const MAX_ACCOUNT_SEARCH_DEPTH = 100;

type RailgunOperation = TransferOperation | UnshieldOperation;

interface TransferOperation {
    kind: 'transfer';
    txns: TxData[];
}

interface UnshieldOperation {
    kind: 'unshield';
    txns: TxData[];
}

export class RailgunPlugin implements Plugin {
    private constructor(
        private network: Network,
        private storage: Storage,
        private secretStorage: SecretStorage,
        private keystore: Keystore,
        private ethProvider: PublicClient,
        private log: Log,
        private indexer: Indexer,
        private account: RailgunAccount,
    ) { }

    static async create(host: Host): Promise<Plugin> {
        const publicClient = createPublicClient({
            transport: custom({
                request: async ({ method, params }) => {
                    return host.ethProvider.request({ method, params });
                }
            })
        })

        const storedChainId = host.storage.get(CHAIN_ID_STORAGE_KEY);
        const chainId = await publicClient.getChainId();
        if (storedChainId === null) {
            host.storage.set(CHAIN_ID_STORAGE_KEY, chainId.toString());
        } else if (storedChainId !== chainId.toString()) {
            throw new Error(`RailgunPlugin: Chain ID mismatch. Stored: ${storedChainId}, Current: ${chainId}`);
        }

        const indexerNetwork = getNetworkConfig(`${BigInt(chainId)}`);

        // TODO: Figure out how to handle snapshots (maybe bundled in the sdk?)
        // and startBlock (maybe via a UI option? Or add as a constructor param?)
        const indexerConfig: IndexerConfig = {
            network: indexerNetwork,
            provider: new EIP1193ProviderAdapter(publicClient),
            storage: new HostStorageAdapter(host.storage, INDEXER_CACHE_STORAGE_KEY),
        };
        const indexer = await createRailgunIndexer(indexerConfig);

        const account = await createAccount(
            host.storage,
            host.keystore,
            indexer,
        );

        return new RailgunPlugin(
            host.network,
            host.storage,
            host.secretStorage,
            host.keystore,
            publicClient,
            host.log,
            indexer,
            account,
        );
    }

    async balance(assets: Array<{ asset: AssetID }>): Promise<Array<{ asset: AssetID, amount: bigint }>> {
        await this.sync();

        let balances: Array<{ asset: AssetID, amount: bigint }> = [];
        for (const { asset } of assets) {
            if (asset.assetType.kind === 'Erc20') {
                const amount = await this.account.getBalance(asset.assetType.address);
                balances.push({ asset, amount });
            } else {
                this.log.warn(`Railgun balance does not support asset: ${asset.assetType}`);
            }
        }


        return balances;
    }

    async prepareShield(assets: Array<{ asset: AssetID, amount: bigint }>): Promise<ShieldPreparation> {
        await this.sync();

        // TODO: Use ShieldMulti for multiple ERC20s in one txn
        const txns: TxData[] = [];
        for (const { asset, amount } of assets) {
            if (asset.assetType.kind === 'Erc20') {
                const txn = await this.account.shield(asset.assetType.address, amount);
                txns.push(txn);
            } else if (asset.assetType.kind === 'Slip44') {
                const txn = await this.account.shieldNative(amount);
                txns.push(txn);
            } else {
                this.log.warn(`Railgun shield does not support asset: ${asset.assetType}`);
            }
        }

        return { txns };
    }

    async prepareUnshield(assets: Array<{ asset: AssetID, amount: bigint }>, to: AccountId): Promise<Operation> {
        await this.sync();
        const receiver: Address = accountIdToAddress(to);

        const txns: TxData[] = [];
        for (const { asset, amount } of assets) {
            if (asset.assetType.kind === 'Erc20') {
                const txn = await this.account.unshield(asset.assetType.address, amount, receiver);
                txns.push(txn);
            } else if (asset.assetType.kind === 'Slip44') {
                const txn = await this.account.unshieldNative(amount, receiver);
                txns.push(txn);
            } else {
                this.log.warn(`Railgun unshield does not support asset: ${asset.assetType}`);
            }
        }

        const operation: UnshieldOperation = {
            kind: 'unshield',
            txns,
        };
        return { inner: operation };
    }

    async prepareTransfer(assets: Array<{ asset: AssetID, amount: bigint }>, to: AccountId): Promise<Operation> {
        await this.sync();
        const receiver: Address = accountIdToAddress(to);

        const txns: TxData[] = [];
        for (const { asset, amount } of assets) {
            if (asset.assetType.kind === 'Erc20') {
                const txn = await this.account.transfer(asset.assetType.address, amount, receiver);
                txns.push(txn);
            } else {
                this.log.warn(`Railgun transfer does not support asset: ${asset.assetType}`);
            }
        }

        const operation: TransferOperation = {
            kind: 'transfer',
            txns,
        };
        return { inner: operation };
    }

    async broadcast(operation: Operation): Promise<void> {
        const railgunOperation = operation.inner as RailgunOperation;
        throw new Error("Method not implemented.");
    }

    private async sync(): Promise<void> {
        if (!this.indexer.sync) {
            this.log.error("Railgun indexer does not support sync");
            return;
        }

        await this.indexer.sync({
            logProgress: true,
        });
    }
}

async function createAccount(storage: Storage, keystore: Keystore, indexer: Indexer): Promise<RailgunAccount> {
    const { viewingKey, spendingKey } = getKeys(storage, keystore);
    const accountConfig: RailgunAccountParameters = {
        indexer,
        credential: {
            type: 'key',
            viewingKey: viewingKey,
            spendingKey: spendingKey,
        },
        storage: new HostStorageAdapter(storage, ACCOUNT_CACHE_STORAGE_KEY),
    }
    const account = await createRailgunAccount(accountConfig);
    return account;
}

function getKeys(storage: Storage, keystore: Keystore): {
    viewingKey: string;
    spendingKey: string;
} {
    const index = storage.get(ACCOUNT_INDEX_STORAGE_KEY);

    if (index !== null) {
        const indexNumber = parseInt(index, 10);
        const paths = derivePathsForIndex(indexNumber);
        const spendingKey = keystore.deriveAt(paths.spending);
        const viewingKey = keystore.deriveAt(paths.viewing);
        return {
            spendingKey,
            viewingKey,
        };
    }

    for (let i = 0; i < MAX_ACCOUNT_SEARCH_DEPTH; i++) {
        const paths = derivePathsForIndex(i);
        try {
            const spendingKey = keystore.deriveAt(paths.spending);
            const viewingKey = keystore.deriveAt(paths.viewing);

            storage.set(ACCOUNT_INDEX_STORAGE_KEY, i.toString());

            return {
                spendingKey,
                viewingKey,
            };
        } catch (e) {
            // Continue searching
        }
    }

    throw new Error("No keys found in keystore");
}
