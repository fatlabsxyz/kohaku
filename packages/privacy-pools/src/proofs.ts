import { Circuits, Prover } from "@fatsolutions/privacy-pools-core-circuits";
import { calculateContext, generateMerkleProof  } from "@0xbow/privacy-pools-core-sdk";
import { Note } from "./plugin/interfaces/protocol-params.interface";
import { Secret } from "./account/keys";
import { commitment } from "./utils";

type ContractProof = {
  pA: readonly [bigint, bigint];
  pB: readonly [readonly [bigint, bigint], readonly [bigint, bigint]];
  pC: readonly [bigint, bigint];
  pubSignals: readonly [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint];
};

// Mock proof generation (stub)
const generateMockProof = (): ContractProof => {
  return {
    pA: [0n, 0n],
    pB: [[0n, 0n], [0n, 0n]],
    pC: [0n, 0n],
    pubSignals: [0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n]
  };
};

type CircuitInputs = unknown;

export const generateProof = (inputs: CircuitInputs): ContractProof => {
  // return generateMockProof();
  return generateRealProof();
};

async function generateRealProof(params: {
  notes: {
    existing: Note & Secret,
    new: Note & Secret;
  };
  withdrawal: { processor: string, data: string, scope: string }
}) {
  const prover = await Prover();

  const stateLeaves: bigint[] = [];  // XXX
  const aspLeaves: bigint[] = [];  // XXX

  const stateMerkleProof = generateMerkleProof(stateLeaves, commitment(params.notes.existing));
  const aspMerkleProof = generateMerkleProof(aspLeaves, params.notes.existing.label);

  const { withdrawal: { processor, data, scope  } } = params;
  const context = calculateContext({ }, scope)

  prover.prove("withdraw", {
    context,
    label: params.notes.existing.label,
    existingNullifier: params.notes.existing.nullifier,
    existingSecret: params.notes.existing.salt,
    existingValue: params.notes.existing.value,
    newNullifier: params.notes.new.nullifier,
    newSecret: params.notes.new.salt,
    withdrawnValue: params.notes.new.value,

    stateIndex: BigInt(stateMerkleProof.index),
    stateRoot: stateMerkleProof.root,
    stateSiblings: stateMerkleProof.siblings,
    stateTreeDepth: 2n,

    ASPIndex: BigInt(aspMerkleProof.index),
    ASPRoot: aspMerkleProof.root,
    ASPSiblings: aspMerkleProof.siblings,
    ASPTreeDepth: 2n,

  });

  // 3. Generate mock proof
  // const proof = generateProof({ existingNote: notes.existing, newNote: notes.new });
}

