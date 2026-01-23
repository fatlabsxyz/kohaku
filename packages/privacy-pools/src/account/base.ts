import { AccountId, AssetAmount, AssetId, ChainId, Operation, Plugin, ShieldPreparation } from "@kohaku-eth/plugins";
import { Address } from "viem";
import { Bytes } from '../types/base';
import { HostInterface } from '../types/host';
import { ISecretManager, SecretManager, SecretManagerParams } from './keys';
import { prepareShield } from './tx/shield';

export const PRIVACY_POOLS_PATH = "m/28784'/1'";

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

type State = unknown;
interface IStateManager {
  sync: () => Promise<void>;
  getDepositCount: () => Promise<number>;
  getState: () => State;
}

function StateManager(): IStateManager {
  return {
    sync: async () => { },
    getDepositCount: async () => 0,
    getState: () => 1,
  };
}

export class PrivacyPoolsV1Protocol implements Plugin {

  static PRIVACY_POOLS_PATH = PRIVACY_POOLS_PATH;
  masterKey: Bytes;
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
    this.masterKey = host.keystore.deriveAtPath(PrivacyPoolsV1Protocol.PRIVACY_POOLS_PATH);
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

  prepareUnshield(assets: Map<AssetId, bigint> | AssetAmount, to: Address): Promise<Operation> {
    throw new Error("Method not implemented.");
  }
  prepareTransfer(assets: Map<AssetId, bigint> | AssetAmount, to: AccountId): Promise<Operation> {
    throw new Error("Method not implemented.");
  }
  broadcast(operation: Operation): Promise<void> {
    throw new Error("Method not implemented.");
  }

}
