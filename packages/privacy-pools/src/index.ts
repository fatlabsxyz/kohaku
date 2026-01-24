// Main factory
export { PrivacyPoolsV1Protocol } from './plugin/base';

// Types
export type { SecretManager, SecretManagerParams, ISecretManager } from './account/keys';
export type { Commitment, Nullifier } from './account/types';
export type { PPv1NetworkConfig as NetworkConfig } from './config';
export type { AssetId, ChainId, Address, U256 } from './types/base';
export type { Transaction, PrepareShieldResult } from './types';

// Configs
export { MOCK_POOL_ADDRESS, MOCK_VERIFIER_ADDRESS, SEPOLIA_CONFIG, MAINNET_CONFIG, E_ADDRESS } from './config';
