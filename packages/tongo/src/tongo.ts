import { Plugin, AssetAmount, ShieldPreparation, PrivateOperation, CustomAccountId, CustomChainId, UnsupportedAssetError, InsufficientBalanceError } from "@kohaku-eth/plugins";
import { AccountId, AssetId, Host, MultiAssetsNotSupportedError } from "@kohaku-eth/plugins";
import { PublicClient } from "viem";
import { Address } from "@kohaku-eth/provider";
import { pubKeyBase58ToAffine, Account as TongoAccount } from "@fatsolutions/tongo-evm";


interface TongoPluginConfig {
    chain: number;
    index: string;
    client: PublicClient;
    deploys: Map<AssetId, Address>;
}

export class TongoPlugin extends Plugin<AssetAmount, ShieldPreparation, PrivateOperation> {
    config: TongoPluginConfig;

    tempmocktongoaccount!: TongoAccount;

    constructor(readonly host: Host, config: TongoPluginConfig) {
        super();
        this.config = config;
    }

    private deriveKey(): bigint {
        const derivation = BigInt(this.host.keystore.deriveAt("m/701160/"+this.config.index)); //TONGO
        const order = 0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001n; //BN254

        return derivation % order;
    }

    private deriveAccount(tongoContract: string, derivedKey?: bigint): TongoAccount {
        if (derivedKey === undefined) { derivedKey = this.deriveKey(); }

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

        const balances: AssetAmount[] = [];

        this.config.deploys.forEach(async (tongoContract, assetId) => {
            if (assets === undefined || assets.includes(assetId)) {
                const tongoAccount = this.deriveAccount(tongoContract, derivedKey);

                balances.push({ asset: assetId, amount: await this._balance(tongoAccount) });
            }
        })

        return balances;
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
}
