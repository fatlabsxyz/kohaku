import { Address } from 'viem';
import { keccak256, concat, toBeHex, getBytes, randomBytes } from 'ethers';
import { Commitment, Nullifier } from '../types';

export type CreateCommitmentFn = (token: Address, value: bigint) => Commitment;
export type GenerateNullifierFn = (commitment: Commitment) => Nullifier;
export type GetCommitmentsFn = () => Commitment[];
export type GetUnspentCommitmentsFn = (token: Address) => Commitment[];
export type AddCommitmentFn = (commitment: Commitment) => void;
export type MarkSpentFn = (nullifier: Nullifier) => void;

export type CommitmentActions = {
  createCommitment: CreateCommitmentFn;
  generateNullifier: GenerateNullifierFn;
  getCommitments: GetCommitmentsFn;
  getUnspentCommitments: GetUnspentCommitmentsFn;
  addCommitment: AddCommitmentFn;
  markSpent: MarkSpentFn;
};

export type CommitmentContext = {
  commitmentKey: Uint8Array;
  nullifierKey: Uint8Array;
  commitments: Commitment[];  // Shared mutable array
};

export const makeCommitmentActions = ({
  commitmentKey,
  nullifierKey,
  commitments
}: CommitmentContext): CommitmentActions => {

  const createCommitment: CreateCommitmentFn = (token, value) => {
    // Generate random blinding factor (16 bytes)
    const randomness = randomBytes(16);

    // Commitment = keccak256(commitmentKey || token || value || randomness)
    const hash = keccak256(concat([
      commitmentKey,
      getBytes(token),
      toBeHex(value, 32),  // 32 bytes for uint256
      randomness
    ]));

    return { hash, token, value, randomness: getBytes(randomness), spent: false };
  };

  const generateNullifier: GenerateNullifierFn = (commitment) => {
    // Nullifier = keccak256(nullifierKey || commitment.hash)
    const hash = keccak256(concat([
      nullifierKey,
      commitment.hash
    ]));

    return { hash, commitment };
  };

  const getCommitments: GetCommitmentsFn = () => [...commitments];

  const getUnspentCommitments: GetUnspentCommitmentsFn = (token) =>
    commitments.filter(c => !c.spent && c.token.toLowerCase() === token.toLowerCase());

  const addCommitment: AddCommitmentFn = (commitment) => {
    commitments.push(commitment);
  };

  const markSpent: MarkSpentFn = (nullifier) => {
    nullifier.commitment.spent = true;
  };

  return {
    createCommitment,
    generateNullifier,
    getCommitments,
    getUnspentCommitments,
    addCommitment,
    markSpent
  };
};
