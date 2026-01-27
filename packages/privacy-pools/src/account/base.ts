import { AccountId, AssetAmount, AssetId, ChainId, Operation, Plugin, ShieldPreparation } from "@kohaku-eth/plugins";
import { Address } from "viem";
import { HostInterface } from '../types/host';
import { ISecretManager, SecretManager, SecretManagerParams } from './keys';
import { prepareShield } from './tx/shield';

interface PrivacyPoolsV1ProtocolContext {
  entrypointAddress: (chainId: ChainId) => string;
}

const DefaultContext: PrivacyPoolsV1ProtocolContext = {
  entrypointAddress: (_chainId: ChainId) => `0x0${_chainId}`
};

interface PrivacyPoolsV1ProtocolParams {
  context: PrivacyPoolsV1ProtocolContext;
  secretManager: (params: SecretManagerParams) => ISecretManager;
  stateManager: () => IStateManager;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type Account = {};

export type Note = {
  precommitment: bigint;
  label: bigint;
  value: bigint;
  deposit: number;
  withdraw: number;
};

type State = unknown;
interface IStateManager {
  getNote(asset: AssetId, amount: bigint): Note | undefined;
  sync: () => Promise<void>;
  getDepositCount: () => Promise<number>;
  getState: () => State;
}

function StateManager(): IStateManager {
  return {
    getNote: (asset: AssetId, amount: bigint): Note | undefined => undefined,
    sync: async () => { },
    getDepositCount: async () => 0,
    getState: () => 1,
  };
}

export class PrivacyPoolsV1Protocol implements Plugin {

  accountIndex: number;
  secretManager: ISecretManager;
  stateManager: IStateManager;
  context: PrivacyPoolsV1ProtocolContext;

  constructor(readonly host: HostInterface,
    {
      context = DefaultContext,
      secretManager = SecretManager,
      stateManager = StateManager,
    }: Partial<PrivacyPoolsV1ProtocolParams> = {}) {
    this.context = context;
    this.accountIndex = 0;
    this.secretManager = secretManager({
      host,
      accountIndex: this.accountIndex
    });
    this.stateManager = stateManager();
  }

  account(): AccountId {
    throw new Error("Method not implemented.");
  }

  balance(assets: Set<AssetId> | undefined): Promise<Map<AssetId, bigint>> {
    throw new Error("Method not implemented.");
  }

  async prepareShield(assets: { asset: AssetId, amount: bigint; }, from?: Address): Promise<ShieldPreparation> {

    await this.stateManager.sync();

    const txns: ShieldPreparation['txns'] = [];

    const { asset, amount } = assets;
    const { chainId } = asset;

    if (chainId.kind !== 'Evm') {
      throw new Error("Only support `Evm` chainId.kind assets");
    }

    const entrypointAddress = this.context.entrypointAddress(chainId);
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
    })

    return {
      inner: {
        existingNoteSecrets,
        newNoteSecrets
      }
    }

  }

  prepareTransfer(assets: Map<AssetId, bigint> | AssetAmount, to: AccountId): Promise<Operation> {
    throw new Error("Method not implemented.");
  }
  broadcast(operation: Operation): Promise<void> {
    throw new Error("Method not implemented.");
  }

}
