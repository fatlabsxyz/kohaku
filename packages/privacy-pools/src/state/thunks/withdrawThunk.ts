import { createAsyncThunk } from '@reduxjs/toolkit';
import { calculateContext } from "@0xbow/privacy-pools-core-sdk";
import { Prover } from "@fatsolutions/privacy-pools-core-circuits";
import { Note } from '../../plugin/interfaces/protocol-params.interface';
import { Secret } from '../../account/keys';
import { Address } from '../../interfaces/types.interface';
import { addressToHex } from '../../utils';
import { RootState } from '../store';
import { MerkleProof } from '../selectors/merkle.selector';

// Use unknown for now as the prover result type - actual type comes from circuits package
export type WithdrawProofResult = unknown;

export interface WithdrawThunkParams {
  // Selector functions
  getNote: (assetAddress: Address, minAmount: bigint) => Note | undefined;
  getNextNote: (note: Note, withdrawAmount: bigint, chainId: bigint, entrypoint: Address) => { note: Note; secrets: Secret };
  getExistingNoteSecrets: (note: Note, chainId: bigint, entrypoint: Address) => Secret;
  getStateMerkleProof: (note: Note & Secret) => MerkleProof;
  getAspMerkleProof: (label: bigint) => MerkleProof;
  getScope: (assetAddress: Address) => bigint;
  // Withdrawal params
  asset: Address;
  amount: bigint;
  recipient: Address;
  withdrawalData: string;
}

export const withdrawThunk = createAsyncThunk<
  WithdrawProofResult,
  WithdrawThunkParams,
  { state: RootState }
>(
  'withdraw/generateProof',
  async (params, { getState }) => {
    const state = getState();
    const { chainId, entrypointAddress } = state.poolInfo;

    // 1. Get existing note (smallest sufficient)
    const existingNote = params.getNote(params.asset, params.amount);

    if (!existingNote) {
      throw new Error("No note with sufficient balance for withdrawal");
    }

    // 2. Get existing note's secrets
    const existingSecrets = params.getExistingNoteSecrets(
      existingNote,
      chainId,
      entrypointAddress
    );

    // 3. Get change note with its secrets
    const { note: changeNote, secrets: changeSecrets } = params.getNextNote(
      existingNote,
      params.amount,
      chainId,
      entrypointAddress
    );

    // 4. Get Merkle proofs (selectors parameterized by note/label)
    const existingNoteFull = { ...existingNote, ...existingSecrets };
    const stateMerkleProof = params.getStateMerkleProof(existingNoteFull);
    const aspMerkleProof = params.getAspMerkleProof(existingNote.label);

    // 5. Calculate context
    // NOTE: The SDK uses branded Hash types, casting for compatibility
    const scope = params.getScope(params.asset);
    const withdrawal = {
      processooor: addressToHex(entrypointAddress) as `0x${string}`,
      data: params.withdrawalData as `0x${string}`,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contextHex = calculateContext(withdrawal, scope as any);
    const context = BigInt(contextHex);

    // 6. Generate ZK proof
    const prover = await Prover();

    return prover.prove("withdraw", {
      context,
      label: existingNote.label,
      existingNullifier: existingSecrets.nullifier,
      existingSecret: existingSecrets.salt,
      existingValue: existingNote.value,
      newNullifier: changeSecrets.nullifier,
      newSecret: changeSecrets.salt,
      withdrawnValue: params.amount,

      stateIndex: BigInt(stateMerkleProof.index),
      stateRoot: stateMerkleProof.root,
      stateSiblings: stateMerkleProof.siblings,
      stateTreeDepth: 2n,

      ASPIndex: BigInt(aspMerkleProof.index),
      ASPRoot: aspMerkleProof.root,
      ASPSiblings: aspMerkleProof.siblings,
      ASPTreeDepth: 2n,
    });
  }
);
