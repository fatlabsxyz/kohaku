// Main factory
export { createPrivacyPoolsAccount, createAccount } from './account/base';
export type { PrivacyPoolsAccount, PrivacyPoolsAccountParams, Account, Config } from './account/base';

// Types
export type { KeyConfig, DerivedKeys } from './account/keys';
export type { Commitment, Nullifier } from './account/types';
export type { NetworkConfig } from './config';

// Configs
export { SEPOLIA_CONFIG, MOCK_POOL_ADDRESS, MOCK_VERIFIER_ADDRESS } from './config';
