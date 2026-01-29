import { AccountId, AssetAmount, AssetId, ChainId, Eip155ChainId, Host, Operation, Plugin, ShieldPreparation } from "@kohaku-eth/plugins";
import { Address } from "viem";
import { ISecretManager, SecretManager } from '../account/keys';
import { prepareShield } from '../account/tx/shield';
import { IStateManager, PrivacyPoolsV1ProtocolContext, PrivacyPoolsV1ProtocolParams } from './interfaces/protocol-params.interface';
import { storeStateManager } from '../state/state-manager';
import { DataService } from '../data/data.service';

const DefaultContext: PrivacyPoolsV1ProtocolContext = {
  entrypointAddress: (_chainId: ChainId) => `0x0${_chainId}`
};

const chainIsEvmChain = (chainId: ChainId): chainId is Eip155ChainId => 
  chainId.namespace !== 'eip155'

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

  account(): Promise<AccountId> {
    throw new Error("Method not implemented.");
  }
  balance(assets: Array<AssetId> | undefined): Promise<Array<AssetAmount>> {
    throw new Error("Method not implemented.");
  }
  prepareTransfer(assets: Array<AssetAmount> | AssetAmount, to: AccountId): Promise<Operation> {
    throw new Error("Method not implemented.");
  }
  broadcast(operation: Operation): Promise<void> {
    throw new Error("Method not implemented.");
  }

  async prepareShield(assets: { asset: AssetId, amount: bigint; }, from?: Address): Promise<ShieldPreparation> {

    const txns: ShieldPreparation['txns'] = [];

    const { asset, amount } = assets;
    const { chainId } = asset;

    if (!chainIsEvmChain(chainId)) {
      throw new Error("Only support evm assets");
    }

    const entrypointAddress = this.context.entrypointAddress(chainId);
    await this.stateManager.sync(chainId, entrypointAddress);

    const depositCount = await this.stateManager.getDepositCount(chainId);
    const secret = this.secretManager.getDepositSecrets({
      entrypointAddress, depositIndex: depositCount, chainId
    });
    const { tx } = await prepareShield({
      host: this.host, secret, shield: { asset, amount }, entrypointAddress
    });

    txns.push(tx);

    return { txns };
  }

  async prepareUnshield(assets: AssetAmount, to: Address): Promise<Operation> {
    
    const { asset, amount } = assets;
    const { chainId } = asset;
    
    if (!chainIsEvmChain(chainId)) {
      throw new Error("Only support evm assets");
    }
    
    const entrypointAddress = this.context.entrypointAddress(chainId);
    await this.stateManager.sync(chainId, entrypointAddress);
    // Get a single note for {asset} with at least {amount}
    const note = this.stateManager.getNote(asset, amount);
    
    if (!note) {
      throw new Error("Not enough balance left in a single note for withdrawing.");
    }
    
    const { precommitment, deposit, withdraw, value } = note;
    
    const existingNoteSecrets = this.secretManager.getSecrets({
      entrypointAddress,
      depositIndex: deposit,
      withdrawIndex: withdraw,
      chainId,
    });
    const newNoteSecrets = this.secretManager.getSecrets({
      entrypointAddress,
      depositIndex: deposit,
      withdrawIndex: withdraw + 1,
      chainId,
    });

    return {
      inner: {
        existingNoteSecrets,
        newNoteSecrets
      }
    };
  }
}
