import { PoolOperation, PrepareShieldResult, PrivacyProtocol } from '../types';
import { AccountId, Address, AssetId, Bytes, ChainId, U256 } from '../types/base';
import { ISecretManager, SecretManager } from '../account/keys';
import { prepareShield } from '../account/tx/shield';
import { IStateManager, PrivacyPoolsV1ProtocolContext, PrivacyPoolsV1ProtocolParams } from './interfaces/protocol-params.interface';
import { storeStateManager } from '../state/state-manager';
import { DataService } from '../data/data.service';
import { HostProviders } from '@kohaku-eth/provider';

export const PRIVACY_POOLS_PATH = "m/28784'/1'";


const DefaultContext: PrivacyPoolsV1ProtocolContext = {
  entrypointAddress: (_chainId: ChainId) => `0x0${_chainId}`
};

export class PrivacyPoolsV1Protocol implements PrivacyProtocol {

  static PRIVACY_POOLS_PATH = PRIVACY_POOLS_PATH;
  masterKey: Bytes;
  accountIndex: number;
  secretManager: ISecretManager;
  stateManager: IStateManager;
  context: PrivacyPoolsV1ProtocolContext;

  constructor(readonly host: HostProviders,
    {
      context = DefaultContext,
      secretManager = SecretManager,
      stateManager = storeStateManager,
    }: Partial<PrivacyPoolsV1ProtocolParams> = {}) {
    this.context = context;
    this.accountIndex = 0;
    this.masterKey = host.keystore.deriveAtPath(PrivacyPoolsV1Protocol.PRIVACY_POOLS_PATH);
    this.secretManager = secretManager({
      host,
      accountIndex: this.accountIndex
    });
    this.stateManager = stateManager({
      entrypointAddress: context.entrypointAddress,
      secretManager: this.secretManager,
      dataService: new DataService({provider: host.ethProvider})
    });
  }

  async prepareShield(assets: Array<{ asset: AssetId; amount: U256; }>): Promise<PrepareShieldResult> {
    if (assets.length > 1) {
      throw new Error();
    }
    
    const transactions: PrepareShieldResult['transactions'] = [];
    
    ///XXX: beware of failed deposits
    for (const { asset, amount } of assets) {
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

      transactions.push(tx);
    }

    return { transactions };
  }

  prepareUnshield(target: Address, assets: Array<{ asset: AssetId; amount: U256; }>): PoolOperation {
    throw new Error('Method not implemented.');
  }

  prepareTransfer(target: AccountId, assets: Array<{ asset: AssetId; amount: U256; }>): PoolOperation {
    throw new Error('Method not implemented.');
  }

  broadcast(operation: PoolOperation): void {
    throw new Error('Method not implemented.');
  }

  balance(assets: Array<{ asset: AssetId; }>): Array<{ asset: AssetId; balance: U256; }> {
    throw new Error('Method not implemented.');
  }

}
