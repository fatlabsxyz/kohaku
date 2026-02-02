/**
 * Proof generation utilities.
 *
 * Note: Real proof generation has been moved to the withdrawThunk in state/thunks/withdrawThunk.ts
 * This file is kept for backwards compatibility and mock proof generation.
 */

export type ContractProof = {
  pA: readonly [bigint, bigint];
  pB: readonly [readonly [bigint, bigint], readonly [bigint, bigint]];
  pC: readonly [bigint, bigint];
  pubSignals: readonly [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint];
};

// Mock proof generation (stub)
export const generateMockProof = (): ContractProof => {
  return {
    pA: [0n, 0n],
    pB: [[0n, 0n], [0n, 0n]],
    pC: [0n, 0n],
    pubSignals: [0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n]
  };
};

type CircuitInputs = unknown;

/**
 * @deprecated Use withdrawThunk for real proof generation
 */
export const generateProof = (_inputs: CircuitInputs): ContractProof => {
  return generateMockProof();
};
