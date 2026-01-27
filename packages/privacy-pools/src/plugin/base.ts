import { AccountId, AssetAmount, AssetId, ChainId, Host, Operation, Plugin, ShieldPreparation } from "@kohaku-eth/plugins";
import { Address } from "viem";
import { ISecretManager, SecretManager } from '../account/keys';
import { prepareShield } from '../account/tx/shield';
import { DataService } from '../data/data.service';
import { storeStateManager } from '../state/state-manager';
import { IStateManager, PrivacyPoolsV1ProtocolContext, PrivacyPoolsV1ProtocolParams } from './interfaces/protocol-params.interface';

const DefaultContext: PrivacyPoolsV1ProtocolContext = {
  entrypointAddress: (_chainId: ChainId) => `0x0${_chainId}`
};

export class PrivacyPoolsV1Protocol implements Plugin {

  accountIndex: number;
  secretManager: ISecretManager;
  stateManager: IStateManager;
  context: PrivacyPoolsV1ProtocolContext;

  constructor(readonly host: Host,
    {
      context = DefaultContext,
      secretManager = SecretManager,
      stateManager = storeStateManager,
    }: Partial<PrivacyPoolsV1ProtocolParams> = {}) {
    this.context = context;
    this.accountIndex = 0;
    this.secretManager = secretManager({
      host,
      accountIndex: this.accountIndex
    });
    this.stateManager = stateManager({
      entrypointAddress: context.entrypointAddress,
      secretManager: this.secretManager,
      dataService: new DataService({ provider: host.ethProvider })
    });
  }

  account(): AccountId {
    throw new Error("Method not implemented.");
  }

  balance(assets: Set<AssetId> | undefined): Promise<Map<AssetId, bigint>> {
    throw new Error("Method not implemented.");
  }

  async prepareShield(assets: { asset: AssetId, amount: bigint; }, from?: Address): Promise<ShieldPreparation> {

    const txns: ShieldPreparation['txns'] = [];

    const { asset, amount } = assets;
    const { chainId } = asset;

    if (chainId.kind !== 'Evm') {
      throw new Error("Only support `Evm` chainId.kind assets");
    }

    const entrypointAddress = this.context.entrypointAddress(chainId);
    await this.stateManager.sync(chainId, entrypointAddress);

    const depositCount = await this.stateManager.getDepositCount();
    const secret = this.secretManager.getDepositSecrets({
      entrypointAddress, depositIndex: depositCount, chainId: chainId.chainId
    });
    const { tx } = await prepareShield({
      host: this.host, secret, shield: { asset, amount }, entrypointAddress
    });

    txns.push(tx);

    return { txns };
  }

  async prepareUnshield(assets: AssetAmount, to: Address): Promise<Operation> {
    await this.stateManager.sync();

    const { asset, amount } = assets;
    const { chainId } = asset;

    if (chainId.kind !== 'Evm') {
      throw new Error("Only support `Evm` chainId.kind assets");
    }

    // Get a single note for {asset} with at least {amount}
    const note = this.stateManager.getNote(asset, amount);

    if (!note) {
      throw new Error("Not enough balance left in a single note for withdrawing.");
    }

    const { precommitment, deposit, withdraw, value } = note;

    const entrypointAddress = this.context.entrypointAddress(chainId);
    const existingNoteSecrets = this.secretManager.getSecrets({
      entrypointAddress,
      depositIndex: deposit,
      withdrawIndex: withdraw,
      chainId: chainId.chainId,
    });
    const newNoteSecrets = this.secretManager.getSecrets({
      entrypointAddress,
      depositIndex: deposit,
      withdrawIndex: withdraw + 1,
      chainId: chainId.chainId,
    });

    return {
      inner: {
        existingNoteSecrets,
        newNoteSecrets
      }
    };
  }

  prepareTransfer(assets: Map<AssetId, bigint> | AssetAmount, to: AccountId): Promise<Operation> {
    throw new Error("Method not implemented.");
  }
  broadcast(operation: Operation): Promise<void> {
    throw new Error("Method not implemented.");
  }

}
