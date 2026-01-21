import { EthereumProvider } from '@kohaku-eth/provider';
import { PPv1NetworkConfig, SEPOLIA_CONFIG } from '../config';
import { DerivedKeys, deriveKeys, KeyConfig } from './keys';
import { Commitment } from './types';
import { CommitmentActions, makeCommitmentActions } from './actions/commitment';
import { Shield, makeCreateShield } from './tx/shield';
import { Unshield, makeUnshield } from './tx/unshield';
import { PoolOperation, PrepareShieldResult, PrivacyProtocol } from '../types';
import { AssetId, U256, Address, AccountId } from '../types/base';

export type PrivacyPoolsAccountParams = {
  credential: KeyConfig;
  provider?: EthereumProvider;
  network?: PPv1NetworkConfig;
};

export type PrivacyPoolsAccount =
  Shield &
  Unshield &
  CommitmentActions & {
    network: PPv1NetworkConfig;
    _internal: {
      keys: DerivedKeys;
      commitments: Commitment[];
    };
  };

export const createPrivacyPoolsAccount = (
  params: PrivacyPoolsAccountParams
): PrivacyPoolsAccount => {
  // 1. Derive keys
  const keys = deriveKeys(params.credential);

  // 2. Network config (default to Sepolia)
  const network = params.network ?? SEPOLIA_CONFIG;

  // 3. In-memory commitment storage
  const commitments: Commitment[] = [];

  // 4. Create commitment actions
  const commitmentActions = makeCommitmentActions({
    commitmentKey: keys.commitmentKey,
    nullifierKey: keys.nullifierKey,
    commitments
  });

  // 5. Create transaction builders
  const shield = makeCreateShield({ network, actions: commitmentActions });
  const unshield = makeUnshield(network, commitmentActions);

  // 6. Compose account
  const account = Object.assign(
    {
      network,
      _internal: { keys, commitments }
    },
    commitmentActions,
    shield,
    unshield
  );

  return account;
};

// Legacy exports for backwards compatibility (deprecated)
export type Config = PrivacyPoolsAccountParams;
export type Account = PrivacyPoolsAccount;
export const createAccount = createPrivacyPoolsAccount;

export class PrivacyPoolsV1Protocol implements PrivacyProtocol {

  prepareShield(assets: Array<{ asset: AssetId; amount: U256; }>): PrepareShieldResult {
    throw new Error('Method not implemented.');
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
