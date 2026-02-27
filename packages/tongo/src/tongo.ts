import { Plugin, AssetAmount, ShieldPreparation, PrivateOperation, CustomAccountId, CustomChainId, UnsupportedAssetError, InsufficientBalanceError, Keystore } from "@kohaku-eth/plugins";
import { AccountId, AssetId, Host, MultiAssetsNotSupportedError } from "@kohaku-eth/plugins";
import { PublicClient } from "viem";
import { Address } from "@kohaku-eth/provider";
import { pubKeyBase58ToAffine, Account as TongoAccount } from "@fatsolutions/tongo-evm";


interface TongoPluginConfig {
    chain: number;
    client: PublicClient;
    deploys: Map<AssetId, Address>;
    deriveKey: (keystore: Keystore) => bigint;
}

export class TongoPlugin extends Plugin<AssetAmount, ShieldPreparation, PrivateOperation> {
    config: TongoPluginConfig;

    tempmocktongoaccount!: TongoAccount;

    constructor(readonly host: Host, config: TongoPluginConfig) {
        super();
        this.config = config;

        if (config.deriveKey === undefined) { this.config.deriveKey = this.defaultKeyDerivationBN254; }
    }

    private deriveKey(): bigint {
        return this.config.deriveKey(this.host.keystore);
    }

    private deriveAccount(tongoContract: string): TongoAccount {
        return this.deriveAccountFromKey(tongoContract, this.deriveKey());
    }

    private deriveAccountFromKey(tongoContract: string, derivedKey: bigint): TongoAccount {
        return new TongoAccount(derivedKey, tongoContract, this.host.ethProvider);
    }

    async account(): Promise<AccountId> {
        return new CustomAccountId(this.deriveAccount("").tongoAddress(), new CustomChainId("tongo-evm", this.config.chain));
    }

    private async _balance(account: TongoAccount): Promise<bigint> {
        const state = await account.state();

        return state.balance + state.pending;
    }

    async balance(assets: Array<AssetId> | undefined): Promise<Array<AssetAmount>> {
        const derivedKey = this.deriveKey();

        const balances: Promise<AssetAmount>[] = [];

        this.config.deploys.forEach(async (tongoContract, assetId) => {
            if (assets === undefined || assets.includes(assetId)) {
                const tongoAccount = this.deriveAccountFromKey(tongoContract, derivedKey);
                const amount = await this._balance(tongoAccount);

                balances.push(new Promise((resolve) => { resolve({ asset: assetId, amount }); }));
            }
        });

        return Promise.all(balances);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async prepareShield(asset: AssetAmount, from?: AccountId): Promise<ShieldPreparation> {
        const tongoContract = this.config.deploys.get(asset.asset);

        if (tongoContract === undefined) { throw UnsupportedAssetError; }

        const fund = await this.deriveAccount(tongoContract).fund({ amount: asset.amount, sender: "sender" });

        return { txns: [fund.approve, fund.toCalldata()] };
    }

    async prepareUnshield(asset: AssetAmount, to: AccountId): Promise<PrivateOperation> {
        const tongoContract = this.config.deploys.get(asset.asset);

        if (tongoContract === undefined) { throw UnsupportedAssetError; }

        const tongoAccount = this.deriveAccount(tongoContract);

        if (asset.amount > await this._balance(tongoAccount)) { throw InsufficientBalanceError; }

        const rollover = await tongoAccount.rollover({ sender: "sender" });
        const withdraw = await tongoAccount.withdraw({ amount: asset.amount, to: to.address, sender: "sender" });

        return { txns: [rollover.toCalldata(), withdraw.toCalldata()] };
    }

    override async prepareTransfer(asset: AssetAmount, to: AccountId): Promise<PrivateOperation> {
        const tongoContract = this.config.deploys.get(asset.asset);

        if (tongoContract === undefined) { throw UnsupportedAssetError; }

        const tongoAccount = this.deriveAccount(tongoContract);

        if (asset.amount > await this._balance(tongoAccount)) { throw InsufficientBalanceError; }

        const rollover = await tongoAccount.rollover({ sender: "sender" });
        const transfer = await tongoAccount.transfer({ amount: asset.amount, to: pubKeyBase58ToAffine(to.address), sender: "sender" });

        return { txns: [rollover.toCalldata(), transfer.toCalldata()] };
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    override prepareTransferMulti(assets: Array<AssetAmount>, to: AccountId): Promise<PrivateOperation> {
        throw new MultiAssetsNotSupportedError();
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async broadcastPrivateOperation(operation: PrivateOperation): Promise<void> {
        throw new Error("Method not implemented.");
    }

    defaultKeyDerivationBN254() {
        const accountIndex = "0";
        const derivation = BigInt(this.host.keystore.deriveAt("m/701160/"+accountIndex)); //TONGO
        const BN254_GROUP_ORDER = 0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001n;

        return derivation % BN254_GROUP_ORDER;
    }
}
