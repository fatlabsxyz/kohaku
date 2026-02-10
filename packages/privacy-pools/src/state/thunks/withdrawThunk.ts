import { calculateContext, Hash } from "@0xbow/privacy-pools-core-sdk";
import { Prover, WithdrawPublicSignals } from "@fatsolutions/privacy-pools-core-circuits";
import { createAsyncThunk } from '@reduxjs/toolkit';
import { Secret } from '../../account/keys';
import { Address } from '../../interfaces/types.interface';
import { INote } from '../../plugin/interfaces/protocol-params.interface';
import { addressToHex } from '../../utils';
import { aspMerkleProofSelector, stateMerkleProofSelector } from '../selectors/merkle.selector';
import { entrypointInfoSelector, poolsSelector } from '../selectors/slices.selectors';
import { RootState } from '../store';

export type ProverInstance = Awaited<ReturnType<typeof Prover>>;
export type ProveResult = Awaited<ReturnType<ProverInstance['prove']>>;
export type WithdrawProofResult = Omit<ProveResult, 'mappedSignals'> & {
  mappedSignals: WithdrawPublicSignals;
};

export interface WithdrawThunkParams {
  // Selector functions
  getNote: (assetAddress: Address, minAmount: bigint) => INote | undefined;
  getNextNote: (note: INote, withdrawAmount: bigint, chainId: bigint, entrypoint: Address) => { note: INote; secrets: Secret; };
  getExistingNoteSecrets: (note: INote, chainId: bigint, entrypoint: Address) => Secret;
  // Prover factory
  proverFactory: () => ReturnType<typeof Prover>;
  // Withdrawal params
  asset: Address;
  amount: bigint;
  recipient: Address;
  relayDataObject: any;
}

export const withdrawThunk = createAsyncThunk<
  WithdrawProofResult,
  WithdrawThunkParams,
  { state: RootState; }
>(
  'withdraw/generateProof',
  async (params, { getState }) => {
    const state = getState();
    
    const { chainId, entrypointAddress } = entrypointInfoSelector(state);

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

    const addressPoolTuple = Array.from(poolsSelector(state)).find(([_, p]) => p.asset === params.asset);

    if (!addressPoolTuple) {
      throw new Error(`No pool found for asset ${params.asset}`);
    }

    const [_, poolInfo] = addressPoolTuple;

    // 4. Get Merkle proofs (selectors parameterized by note/label)
    const existingNoteFull = { ...existingNote, ...existingSecrets };

    const stateMerkleProof = stateMerkleProofSelector(state, poolInfo.address, existingNoteFull);
    const aspMerkleProof = aspMerkleProofSelector(state, existingNote.label);

    // 5. Calculate context
    // NOTE: The SDK uses branded Hash types, casting for compatibility
    const withdrawal = {
      processooor: addressToHex(entrypointAddress) as `0x${string}`,
      data: params.relayDataObject.withdrawalData as `0x${string}`,
    };
    const contextHex = calculateContext(withdrawal, poolInfo.scope as Hash);
    const context = BigInt(contextHex);

    // 6. Generate ZK proof
    const prover = await params.proverFactory();
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
