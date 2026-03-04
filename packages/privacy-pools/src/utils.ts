import { poseidon } from "maci-crypto/build/ts/hashing";
import { decodeAbiParameters, encodeFunctionData, getAddress } from "viem";
import { entrypointAbi, relayDataAbi } from "./data/abis/entrypoint.abi";
import { poolAbi } from "./data/abis/pool.abi";
import { Address } from "./interfaces/types.interface";
import { CommitmentProveOutput, INote } from "./plugin/interfaces/protocol-params.interface";
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

/**
 * Converts an string type to a Address
 */
export function stringToAddress(addressString: string): Address {
  return BigInt(getAddress(addressString));
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

type CommitmentSignals = [bigint, bigint, bigint, bigint];
export function encodeRagequitPayload(proveOutput: CommitmentProveOutput) {

  const {
    proof: { pi_a, pi_b, pi_c },
    publicSignals
  } = proveOutput;

  const pubSignals = publicSignals.map(BigInt) as CommitmentSignals;

  if (pubSignals.length !== 4) {
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
    abi: poolAbi,
    functionName: "ragequit",
    args: [{ pubSignals, pA, pB, pC }]
  });

}

export function decodeRelayData(encodedData: `0x${string}`) {
  const [relayData] = decodeAbiParameters([relayDataAbi], encodedData);

  return relayData;
}
