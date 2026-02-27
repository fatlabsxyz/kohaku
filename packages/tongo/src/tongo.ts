import { Plugin, AssetAmount, ShieldPreparation, PrivateOperation, CustomAccountId, CustomChainId, UnsupportedAssetError, InsufficientBalanceError } from "@kohaku-eth/plugins";
import { AccountId, AssetId, Host, MultiAssetsNotSupportedError } from "@kohaku-eth/plugins";
import { PublicClient } from "viem";
import { Address } from "@kohaku-eth/provider";
import { pubKeyBase58ToAffine, Account as TongoAccount } from "@fatsolutions/tongo-evm";

interface TongoPluginConfig {
    chain: number;
    client: PublicClient;
    deploys: Map<AssetId, Address>;
}

export class TongoPlugin extends Plugin<AssetAmount, ShieldPreparation, PrivateOperation> {
    host: Host; 
    config: TongoPluginConfig;

    tempmocktongoaccount!: TongoAccount;
    
    constructor(readonly _host: Host, config: TongoPluginConfig) {
        super();
        this.host = _host;
        this.config = config;
    }

    async account(): Promise<AccountId> {
        const tongoAccount = new TongoAccount(1n, "", this.host.ethProvider);

        return new CustomAccountId(tongoAccount.tongoAddress(), new CustomChainId("tongo-evm", this.config.chain));
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

    async prepareShield(_asset: AssetAmount, from?: AccountId): Promise<ShieldPreparation> {
        const tongoAddress = this.config.deploys.get(_asset.asset);

        if (tongoAddress === undefined) { throw UnsupportedAssetError; }

        const sender = from?.address ?? "0x0000000000000000000000000000000000000001";
        const tongoAccount = new TongoAccount(1n, tongoAddress, this.host.ethProvider);
        const fund = await tongoAccount.fund({ amount: _asset.amount, sender });
        await fund.populateApprove();

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

    override async prepareTransfer(asset: AssetAmount, to: AccountId, from?: AccountId): Promise<PrivateOperation> {
        if (asset.amount > (await this.balance([asset.asset]))[0]!.amount) { throw InsufficientBalanceError; }

        const tongoAddress = this.config.deploys.get(asset.asset);

        if (tongoAddress === undefined) { throw UnsupportedAssetError; }

        const sender = from?.address ?? "0x0000000000000000000000000000000000000001";

        const tongoAccount = new TongoAccount(1n, tongoAddress, this.host.ethProvider);
        const { pending } = await tongoAccount.state();
        const txns = [];

        if (pending > 0n) {
            const rollover = await tongoAccount.rollover({ sender });
            txns.push(rollover.toCalldata());
        }

        const transfer = await tongoAccount.transfer({
            amount: asset.amount,
            to: pubKeyBase58ToAffine(to.address),
            sender,
        });
        txns.push(transfer.toCalldata());

        return { txns };
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
