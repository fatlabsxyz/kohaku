import { poseidon } from "maci-crypto/build/ts/hashing";
import { INote } from "./plugin/interfaces/protocol-params.interface";
import { Address } from "./interfaces/types.interface";
import { encodeFunctionData } from "viem";
import { entrypointAbi } from "./data/abis/entrypoint.abi";
import { WithdrawalPayload } from "./relayer/interfaces/relayer-client.interface";
import { WithdrawProveOutput } from "./state/thunks/withdrawThunk";

/**
 * Given a note, computes it commitment
 *
 */
export function commitment({ balance: value, label, precommitment }: INote): bigint {
  return poseidon([value, label, precommitment]);
}

/**
 * Converts an Address type to a hex string
 */
export function addressToHex(address: Address, padding = 40): `0x${string}` {
  return `0x${address.toString(16).padStart(padding, '0')}`;
}

type WithdrawSignals = [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint];
export function encodeWithdrawalPayload(
  withdraw: WithdrawalPayload,
  proveOutput: WithdrawProveOutput,
  scope: bigint
) {

  const {
    proof: { pi_a, pi_b, pi_c },
    publicSignals
  } = proveOutput;

  const pubSignals = publicSignals.map(BigInt) as WithdrawSignals;
  if (pubSignals.length !== 8) {
    throw new Error("Invalid proof");
  }

  const definedOrThrow = <T>(i: T | undefined) => {
    if (i) {
      return i;
    }
    throw new Error("Undefined");
  };

  const pA = [pi_a[0], pi_a[1]].map(definedOrThrow).map(BigInt) as [bigint, bigint];
  const pB = [
    [definedOrThrow(pi_b[0])[1], definedOrThrow(pi_b[0])[0]].map(definedOrThrow).map(BigInt),
    [definedOrThrow(pi_b[1])[1], definedOrThrow(pi_b[1])[0]].map(definedOrThrow).map(BigInt),
  ] as [[bigint, bigint], [bigint, bigint]];
  const pC = [pi_c[0], pi_c[1]].map(definedOrThrow).map(BigInt) as [bigint, bigint];

  return encodeFunctionData({
    abi: entrypointAbi,
    functionName: "relay",
    args: [withdraw, { pubSignals, pA, pB, pC }, scope]
  });

}
