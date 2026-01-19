import { MOCK_POOL_ADDRESS, MOCK_VERIFIER_ADDRESS } from './constants';

export type NetworkConfig = {
  CHAIN_ID: number;
  POOL_ADDRESS: string;
  VERIFIER_ADDRESS: string;
  WETH: string;
};

// Sepolia testnet config with mocks
export const SEPOLIA_CONFIG: NetworkConfig = {
  CHAIN_ID: 11155111,
  POOL_ADDRESS: MOCK_POOL_ADDRESS,
  VERIFIER_ADDRESS: MOCK_VERIFIER_ADDRESS,
  WETH: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
};

// Re-export constants
export { MOCK_POOL_ADDRESS, MOCK_VERIFIER_ADDRESS, COMMITMENT_TREE_DEPTH, POOL_VERSION } from './constants';
