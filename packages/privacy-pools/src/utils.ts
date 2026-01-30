import { poseidon } from "maci-crypto/build/ts/hashing";
import { Note } from "./plugin/interfaces/protocol-params.interface";
import { Address } from "./interfaces/types.interface";

/**
 * Given a note, computes it commitment
 *
 */
export function commitment({ value, label, precommitment }: Note): bigint {
  return poseidon([value, label, precommitment]);
}

/**
 * Converts an Address type to a hex string
 */
export function addressToHex(address: Address): string {
  return `0x${address.toString(16).padStart(40, '0')}`;
}
