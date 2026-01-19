import { EthereumProvider } from '@kohaku-eth/provider';
import { NetworkConfig, SEPOLIA_CONFIG } from '../config';
import { DerivedKeys, deriveKeys, KeyConfig } from './keys';
import { Commitment } from './types';
import { CommitmentActions, makeCommitmentActions } from './actions/commitment';
import { Shield, makeShield } from './tx/shield';
import { Unshield, makeUnshield } from './tx/unshield';

export type PrivacyPoolsAccountParams = {
  credential: KeyConfig;
  provider?: EthereumProvider;
  network?: NetworkConfig;
};

export type PrivacyPoolsAccount =
  Shield &
  Unshield &
  CommitmentActions & {
    network: NetworkConfig;
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
  const shield = makeShield(network, commitmentActions);
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
