import { Address } from 'viem';

export type Commitment = {
  hash: string;           // Commitment hash (what goes on-chain)
  token: Address;         // Token address
  value: bigint;          // Amount
  randomness: Uint8Array; // Random blinding factor
  spent: boolean;         // Whether nullifier was used
  index?: number;         // Position in merkle tree (optional)
};

export type Nullifier = {
  hash: string;           // Nullifier hash
  commitment: Commitment; // Reference to spent commitment
};
