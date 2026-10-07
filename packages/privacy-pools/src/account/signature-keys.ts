import { Keystore } from '@kohaku-eth/plugins';
import { poseidon } from 'maci-crypto/build/ts/hashing.js';
import { privateKeyToAccount } from 'viem/accounts';
import {
  concat,
  hexToBigInt,
  keccak256,
  slice,
  stringToBytes,
  stringToHex,
  toBytes,
  toHex,
  type Hex,
  type TypedDataDomain,
} from 'viem';

import {
  DeriveDepositSecretParams,
  DeriveSecretsParams,
  DeriveWithdrawalSecretsParams,
  ISecretManager,
  Secret,
  SecretManagerParams,
} from './keys';

/** Signature-derived secrets for Privacy Pools v1 — an alternative to the
 * BIP-32 HD scheme in `./keys.ts`. A note's secret content lives in one
 * deterministic EIP-712 signature (domain binds chain/entrypoint):
 *
 *   σ         = sign(PrivacyPoolNote(depositIndex, secretIndex))
 *   nullifier = trunc31(keccak256("nullifier" ‖ σ))
 *   salt      = trunc31(keccak256("salt"      ‖ σ))
 *
 * The truncated 31-byte values (< BN254 field) become the field elements
 * directly, then feed the usual poseidon commitment pipeline. Determinism needs
 * an RFC-6979 signer (ECDSA); `KeystoreNoteSigner` satisfies this via viem/@noble.
 * Selected by injecting `SignatureSecretManager` at the `secretManager` slot;
 * notes are disjoint from the HD scheme, so the factory choice is the version.
 */

/** The message a note signature is bound to. Deposit and secret (withdrawal)
 * index are both embedded — a deposit spawns a lineage of partial-withdrawal notes. */
export interface NoteMessage {
  chainId: bigint;
  entrypointAddress: bigint;
  depositIndex: number;
  secretIndex: number;
}

// Version 2 of the Privacy Pools derivation tree (version 1 is the HD scheme in
// `./keys.ts`). The signing identity is a single key at the account root.
const SIGNATURE_SCHEME_PATH = "m/28784'/2'";

const DOMAIN_SALT = keccak256(stringToHex('kohaku'));

// chainId and entrypoint are intentionally NOT in the struct: the EIP-712 domain
// separator already binds both (domain.chainId / verifyingContract).
const NOTE_TYPES = {
  PrivacyPoolNote: [
    { name: 'depositIndex', type: 'uint64' },
    { name: 'secretIndex', type: 'uint64' },
  ],
} as const;

/** The fully-formed EIP-712 envelope for a note. Built only by {@link NoteSigner}
 * so domain/types/primaryType are a single source of truth no signer can diverge from. */
export interface NoteEnvelope {
  domain: TypedDataDomain;
  types: typeof NOTE_TYPES;
  primaryType: 'PrivacyPoolNote';
  message: {
    depositIndex: bigint;
    secretIndex: bigint;
  };
}

/** `trunc31(keccak256(tag ‖ σ))` as a field element. 31 bytes keeps the result below
 * BN254 without modular bias; `tag` domain-separates the halves from the one signature. */
function fieldFromSig(tag: string, sig: Hex): bigint {
  const digest = keccak256(concat([stringToBytes(tag), toBytes(sig)]));

  return hexToBigInt(slice(digest, 0, 31));
}

/** Base note signer: owns the EIP-712 envelope construction, so every concrete
 * signer binds notes to the *same* typed-data standard. The only pluggable seam
 * is {@link signEnvelope} — "sign this envelope with your account"; subclasses
 * choose the key, never the envelope. σ is used verbatim (standard EIP-712, v ∈ {27, 28}). */
export abstract class NoteSigner {
  async signNote(msg: NoteMessage): Promise<Hex> {
    return this.signEnvelope(this.buildEnvelope(msg));
  }

  private buildEnvelope({ chainId, entrypointAddress, depositIndex, secretIndex }: NoteMessage): NoteEnvelope {
    return {
      domain: {
        name: 'PrivacyPools Keychain',
        version: '1',
        chainId: Number(chainId),
        verifyingContract: toHex(entrypointAddress, { size: 20 }),
        salt: DOMAIN_SALT,
      },
      types: NOTE_TYPES,
      primaryType: 'PrivacyPoolNote',
      message: {
        depositIndex: BigInt(depositIndex),
        secretIndex: BigInt(secretIndex),
      },
    };
  }

  /** Sign the envelope verbatim with this signer's account; MUST be deterministic (RFC-6979). */
  protected abstract signEnvelope(envelope: NoteEnvelope): Promise<Hex>;
}

/** Any note signer the manager can be driven by — satisfied only by
 * {@link NoteSigner} subclasses, which own the envelope. */
export type PPSigner = Pick<NoteSigner, 'signNote'>;

/** In-process signer backed by the host keystore. Derives one secp256k1
 * identity at the account root, then RFC-6979-signs each note envelope. */
export class KeystoreNoteSigner extends NoteSigner {
  constructor(
    private readonly keystore: Keystore,
    private readonly accountIndex: number,
  ) {
    super();
  }

  protected async signEnvelope(envelope: NoteEnvelope): Promise<Hex> {
    const key = await this.keystore.deriveAt(`${SIGNATURE_SCHEME_PATH}/${this.accountIndex}'`);

    return privateKeyToAccount(key).signTypedData(envelope);
  }
}

export interface SignatureSecretManagerParams extends SecretManagerParams {
  signer?: PPSigner;
}

export function SignatureSecretManager({
  host,
  accountIndex = 0,
  signer,
}: SignatureSecretManagerParams): ISecretManager {
  const noteSigner = signer ?? new KeystoreNoteSigner(host.keystore, accountIndex);

  // Memoize the signature per message — signing re-derives the HD key + runs
  // ECDSA, and discovery probes the same keys repeatedly (the keccak/poseidon
  // tail is cheap, so only the signature is cached). The promise is stored to
  // dedupe concurrent misses; a rejected one is evicted so it stays retryable.
  const sigCache = new Map<string, Promise<Hex>>();

  const signNote = (msg: NoteMessage): Promise<Hex> => {
    const key = `${msg.chainId}:${msg.entrypointAddress}:${msg.depositIndex}:${msg.secretIndex}`;
    const hit = sigCache.get(key);

    if (hit) return hit;

    const pending = noteSigner.signNote(msg).catch((err) => {
      sigCache.delete(key);
      throw err;
    });

    sigCache.set(key, pending);

    return pending;
  };

  const deriveSecrets = async ({ chainId, entrypointAddress, depositIndex, secretIndex }: DeriveSecretsParams): Promise<Secret> => {
    const sig = await signNote({ chainId, entrypointAddress, depositIndex, secretIndex });
    const nullifier = fieldFromSig('nullifier', sig);
    const salt = fieldFromSig('salt', sig);
    const precommitment = poseidon([nullifier, salt]);
    const nullifierHash = poseidon([nullifier]);

    return { nullifier, salt, precommitment, nullifierHash };
  };

  const getDepositSecrets = ({ entrypointAddress, chainId, depositIndex }: DeriveDepositSecretParams) => {
    return deriveSecrets({ entrypointAddress, chainId, depositIndex, secretIndex: 0 });
  };

  const getSecrets = ({ entrypointAddress, chainId, depositIndex, withdrawIndex }: DeriveWithdrawalSecretsParams) => {
    return deriveSecrets({ entrypointAddress, chainId, depositIndex, secretIndex: withdrawIndex });
  };

  const deriveEphemeralSigner = async ({ chainId, entrypointAddress, depositIndex, withdrawIndex }: DeriveWithdrawalSecretsParams) => {
    const sig = await signNote({ chainId, entrypointAddress, depositIndex, secretIndex: withdrawIndex });
    const key = fieldFromSig('signer', sig);

    return `0x${key.toString(16).padStart(64, '0')}` as `0x${string}`;
  };

  return {
    getDepositSecrets,
    getSecrets,
    deriveEphemeralSigner,
  };
}
