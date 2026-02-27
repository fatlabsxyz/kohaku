import { Plugin, AssetAmount, ShieldPreparation, PrivateOperation, CustomAccountId, CustomChainId, UnsupportedAssetError, InsufficientBalanceError, Keystore } from "@kohaku-eth/plugins";
import { AccountId, AssetId, Host, MultiAssetsNotSupportedError } from "@kohaku-eth/plugins";
import { Address } from "@kohaku-eth/provider";
import { pubKeyBase58ToAffine, Account as TongoAccount } from "@fatsolutions/tongo-evm";

import { IKeystoreManager, IKeystoreManagerFactory, KeystoreManagerFactory } from "./keystoreManager";

interface TongoPluginConfig {
    chain: number;
    deploys: Map<AssetId, Address>;
    keystoreManager: IKeystoreManagerFactory
}

export class TongoPlugin extends Plugin<AssetAmount, ShieldPreparation, PrivateOperation> {
    chain: number;
    deploys: Map<AssetId, Address>;
    keystoreManager: IKeystoreManager;

    constructor(readonly host: Host, {
        chain = 1,
        deploys = new Map(),
        keystoreManager = KeystoreManagerFactory,
    }: Partial<TongoPluginConfig> = {}) {
        super();
        this.chain = chain;
        this.deploys = deploys;
        this.keystoreManager = keystoreManager({ host });
    }

    private async getSender(): Promise<string> {
        const accounts = await this.host.ethProvider.request({ method: 'eth_accounts' }) as string[];
        return accounts[0];
    }

    private deriveAccount(tongoContract: string): TongoAccount {
        return this.deriveAccountFromKey(tongoContract, this.keystoreManager.deriveKey());
    }

    private deriveAccountFromKey(tongoContract: string, derivedKey: bigint): TongoAccount {
        return new TongoAccount(derivedKey, tongoContract, this.host.ethProvider);
    }

    async account(): Promise<AccountId> {
        return new CustomAccountId(this.deriveAccount("").tongoAddress(), new CustomChainId("tongo-evm", this.chain));
    }

    private async _balance(account: TongoAccount): Promise<bigint> {
        const state = await account.state();

        return state.balance + state.pending;
    }

    async balance(assets: Array<AssetId> | undefined): Promise<Array<AssetAmount>> {
        const entries = [...this.config.deploys.entries()]
            .filter(([assetId]) => assets === undefined || assets.includes(assetId));

        return Promise.all(
            entries.map(async ([assetId, tongoAddress]) => {
                const tongoAccount = new TongoAccount(1n, tongoAddress, this.host.ethProvider);
                const state = await tongoAccount.state();

                return { asset: assetId, amount: state.balance + state.pending };
            })
        );
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async prepareShield(asset: AssetAmount, from?: AccountId): Promise<ShieldPreparation> {
        const tongoContract = this.deploys.get(asset.asset);

        if (tongoContract === undefined) { throw UnsupportedAssetError; }

        const fund = await this.deriveAccount(tongoContract).fund({ amount: asset.amount, sender: from!.address });

        return { txns: [fund.approve, fund.toCalldata()] };
    }

    async prepareUnshield(_asset: AssetAmount, to: AccountId): Promise<PrivateOperation> {
        if (_asset.amount > (await this.balance([_asset.asset]))[0]!.amount) { throw InsufficientBalanceError; }

        const tongoAddress = this.config.deploys.get(_asset.asset);

        if (tongoAddress === undefined) { throw UnsupportedAssetError; }

        const tongoAccount = new TongoAccount(1n, tongoAddress, this.host.ethProvider);
        const { pending } = await tongoAccount.state();
        const txns = [];

        if (pending > 0n) {
            const rollover = await tongoAccount.rollover({ sender: to.address });
            txns.push(rollover.toCalldata());
        }

        const withdraw = await tongoAccount.withdraw({ amount: _asset.amount, to: to.address, sender: to.address });
        txns.push(withdraw.toCalldata());

        return { txns };
    }

    override async prepareTransfer(asset: AssetAmount, to: AccountId): Promise<PrivateOperation> {
        const tongoContract = this.deploys.get(asset.asset);

        if (tongoContract === undefined) { throw UnsupportedAssetError; }

        const tongoAccount = this.deriveAccount(tongoContract);

        if (asset.amount > await this._balance(tongoAccount)) { throw InsufficientBalanceError; }

        const sender = await this.getSender();
        const rollover = await tongoAccount.rollover({ sender });
        const transfer = await tongoAccount.transfer({ amount: asset.amount, to: pubKeyBase58ToAffine(to.address), sender });

        return { txns: [rollover.toCalldata(), transfer.toCalldata()] };
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    override prepareTransferMulti(assets: Array<AssetAmount>, to: AccountId, from?: AccountId): Promise<PrivateOperation> {
        throw new MultiAssetsNotSupportedError();
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async broadcastPrivateOperation(operation: PrivateOperation): Promise<void> {
        throw new Error("Method not implemented.");
    }
}
