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
export function addressToHex(address: Address): `0x${string}` {
  return `0x${address.toString(16).padStart(40, '0')}`;
}

export function encodeWithdrawalPayload(
  withdraw: WithdrawalPayload,
  proveOutput: WithdrawProveOutput,
  scope: bigint
) {

  const {
    proof: { pi_a: pA, pi_b: pB, pi_c: pC },
    publicSignals: pubSignals
  } = proveOutput;

  // return encodeFunctionData({
  //   abi: entrypointAbi,
  //   functionName: "relay",
  //   args: [withdraw, { pubSignals, pA, pB, pC }, scope]
  // });

  return "0xEncoded"
}

