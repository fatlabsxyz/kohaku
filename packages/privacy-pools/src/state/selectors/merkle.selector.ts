import { createSelector } from '@reduxjs/toolkit';
import { generateMerkleProof } from "@0xbow/privacy-pools-core-sdk";
import { RootState } from '../store';
import { Note } from '../../plugin/interfaces/protocol-params.interface';
import { Secret } from '../../account/keys';
import { commitment } from '../../utils';

export type MerkleProof = {
  index: number;
  root: bigint;
  siblings: bigint[];
};

// Mocked for now - returns empty array
export const createStateLeavesSelector = () => {
  return createSelector(
    [(state: RootState) => state.deposits],
    (_deposits): bigint[] => {
      // TODO: Build actual merkle leaves from deposits
      return [];
    }
  );
};

// Mocked for now - returns empty array
export const createAspLeavesSelector = () => {
  return createSelector(
    [(state: RootState) => state.pools],
    (_pools): bigint[] => {
      // TODO: Build actual ASP leaves from approved labels
      return [];
    }
  );
};

// State Merkle proof selector - parameterized by note
export const createStateMerkleProofSelector = (
  stateLeavesSelector: ReturnType<typeof createStateLeavesSelector>
) => {
  return createSelector(
    [
      stateLeavesSelector,
      (_state: RootState, note: Note & Secret) => note,
    ],
    (stateLeaves, note): MerkleProof => {
      return generateMerkleProof(stateLeaves, commitment(note));
    }
  );
};

// ASP Merkle proof selector - parameterized by label
export const createAspMerkleProofSelector = (
  aspLeavesSelector: ReturnType<typeof createAspLeavesSelector>
) => {
  return createSelector(
    [
      aspLeavesSelector,
      (_state: RootState, label: bigint) => label,
    ],
    (aspLeaves, label): MerkleProof => {
      return generateMerkleProof(aspLeaves, label);
    }
  );
};
