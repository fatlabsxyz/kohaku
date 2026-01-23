import { Host, Log, Operation, Plugin, ShieldPreparation, Storage } from '@kohaku-eth/plugins';
import { AccountId, AssetID } from 'node_modules/@kohaku-eth/plugins/src/types';

const DEPOSITS_STORAGE_KEY = 'tc-deposits';

interface TcDeposit {
    amount: bigint;
    txhash: string;
    withdrawn: boolean;
}

export class TcClassicPlugin implements Plugin {
    private constructor(
        private storage: Storage,
        private log: Log,
    ) { }

    static async create(host: Host): Promise<Plugin> {
        return new TcClassicPlugin(
            host.storage,
            host.log,
        );
    }

    async balance(assets: Array<{ asset: AssetID }>): Promise<Array<{ asset: AssetID, amount: bigint }>> {
        const slip44 = assets.find(a => a.asset.assetType.kind === 'Slip44');
        if (!slip44) {
            this.log.error('No supported assets to get balance for.');
            return [];
        }

        const deposits = this.load_deposits();
        let total = BigInt(0);
        for (const deposit of deposits) {
            if (!deposit.withdrawn) {
                total += deposit.amount;
            }
        }
        return [{ asset: slip44.asset, amount: total }];
    }

    async prepareShield(assets: Array<{ asset: AssetID, amount: bigint }>): Promise<ShieldPreparation> {
        const slip44 = assets.find(a => a.asset.assetType.kind === 'Slip44');
        if (!slip44) {
            throw new Error('No supported assets to shield.');
        }

        throw new Error('Method not implemented.');
    }

    async prepareUnshield(assets: Array<{ asset: AssetID, amount: bigint }>, to: AccountId): Promise<Operation> {
        const slip44 = assets.find(a => a.asset.assetType.kind === 'Slip44');
        if (!slip44) {
            throw new Error('No supported assets to shield.');
        }

        throw new Error('Method not implemented.');
    }

    async prepareTransfer(assets: Array<{ asset: AssetID, amount: bigint }>, to: AccountId): Promise<Operation> {
        throw new Error('Method not supported.');
    }

    async broadcast(operation: Operation): Promise<void> {
        throw new Error('Method not implemented.');
    }

    private load_deposits(): TcDeposit[] {
        const data = this.storage.get(DEPOSITS_STORAGE_KEY);
        if (data) {
            return JSON.parse(data) as TcDeposit[];
        } else {
            return [];
        }
    }
}

