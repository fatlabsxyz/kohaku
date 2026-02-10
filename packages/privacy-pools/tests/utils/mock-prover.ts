import { ContractProof, withdrawObjectToCircuitBus, Prover, Circuits, WithdrawPublicSignals, CircuitName, CircuitInputSignalsMap, CircuitPublicSignalsMap } from "@fatsolutions/privacy-pools-core-circuits";
import * as snarkjs from "snarkjs";

// Mock proof
export const mockedContractProof: ContractProof = {
  pA: [0n, 0n],
  pB: [[0n, 0n], [0n, 0n]],
  pC: [0n, 0n],
  pubSignals: [0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n]
};

export const mockedGroth16Proof: snarkjs.Groth16Proof = {
  pi_a: ["0", "0"],
  pi_b: [["0", "0"], ["0", "0"]],
  pi_c: ["0", "0"],
  protocol: "groth16",
  curve: "bn254"
};

export const mockWithdrawPublicSignals = withdrawObjectToCircuitBus({
  context: 0n,
  existingNullifierHash: 0n,
  newCommitmentHash: 0n,
  stateRoot: 0n,
  stateTreeDepth: 0n,
  withdrawnValue: 0n,
  ASPRoot: 0n,
  ASPTreeDepth: 0n,
});

export type ProverInstance = Awaited<ReturnType<typeof Prover>>;
export type ProveResult = Awaited<ReturnType<ProverInstance['prove']>>;
export type WithdrawProveResult = Omit<ProveResult, 'mappedSignals'> & {
  mappedSignals: Extract<ProveResult['mappedSignals'], 'WithdrawPublicSignals'>;
};

const mockWithdrawPublicSignalsObject: WithdrawPublicSignals = {
  context: 0n,
  existingNullifierHash: 0n,
  newCommitmentHash: 0n,
  stateRoot: 0n,
  stateTreeDepth: 0n,
  withdrawnValue: 0n,
  ASPRoot: 0n,
  ASPTreeDepth: 0n,
};

export const mockProver: ProverInstance = {
  circuits: new Circuits(),
  prove: <C extends CircuitName>(
    _circuit: C,
    _signals: CircuitInputSignalsMap[C]
  ): Promise<{
    proof: snarkjs.Groth16Proof;
    publicSignals: string[];
    mappedSignals: CircuitPublicSignalsMap[C];
  }> => {
    // This mock only supports the "withdraw" circuit
    // Cast the result to the generic return type
    return Promise.resolve({
      proof: mockedGroth16Proof,
      mappedSignals: mockWithdrawPublicSignalsObject as CircuitPublicSignalsMap[C],
      publicSignals: withdrawObjectToCircuitBus(mockWithdrawPublicSignalsObject) as string[]
    });
  },
};

export const mockProverFactory: typeof Prover = () => Promise.resolve(mockProver);
