import { HDNodeWallet, Wallet, keccak256, concat, toUtf8Bytes, getBytes } from 'ethers';
import { Bytes } from '../types/base';
import { poseidon } from "maci-crypto/build/ts/hashing.js";

/** BIP32-BIP43 - Privacy Pools v1
 *                                                LABEL >>>
 * m/purpose'/version'/chain'/account'/ -- /secret_type'/deposit'   /withdraw
 *                                                  L-> PH[depositSecret(N|C), entrypointAddress] -> circuit
 *                                                              L-> PH[withdrawSecret(N|C), entrypointAddress] -> circuit
 */

const PRIVACY_POOLS_PATH = "m/28784'/1'";
const HARDENED_OFFSET = 0x80000000;

export type KeyConfig =
  | { type: 'mnemonic'; mnemonic: string; accountIndex: number; }
  | { type: 'key'; commitmentKey: string; nullifierKey: string; };

export type DerivedKeys = {
  commitmentKey: Uint8Array;  // For generating commitments
  nullifierKey: Uint8Array;   // For generating nullifiers
};

// Derive keys from mnemonic using simple BIP44 derivation + hashing
export const deriveKeysFromMnemonic = (mnemonic: string, accountIndex: number): DerivedKeys => {

  const wallet = HDNodeWallet.fromPhrase(mnemonic, undefined, PRIVACY_POOLS_PATH);

  const derivedWallet = wallet.deriveChild(accountIndex + HARDENED_OFFSET);

  const derivedMasterCommitment = derivedWallet.deriveChild(0 + HARDENED_OFFSET);
  const derivedMasterNullifier = derivedWallet.deriveChild(1 + HARDENED_OFFSET);

  const commitmentKey = getBytes(derivedMasterCommitment.privateKey);
  const nullifierKey = getBytes(derivedMasterNullifier.privateKey);

  return { commitmentKey, nullifierKey };
};

// Use provided keys directly
export const deriveKeysFromPrivateKeys = (commitmentKey: string, nullifierKey: string): DerivedKeys => ({
  commitmentKey: getBytes(commitmentKey),
  nullifierKey: getBytes(nullifierKey),
});

export const deriveKeys = (config: KeyConfig): DerivedKeys => {
  if (config.type === 'mnemonic') {
    return deriveKeysFromMnemonic(config.mnemonic, config.accountIndex);
  }

  return deriveKeysFromPrivateKeys(config.commitmentKey, config.nullifierKey);
};

function hashToSnarkField(numberLikes: (string | bigint)[]) {
  const _bigints: bigint[] = [];
  for (const n of numberLikes) {
    if (typeof n === 'string') {
      try {
        _bigints.push(BigInt(n));
      } catch (e) {
        throw e;
      }
    } else {
      _bigints.push(n);
    }
  }
  return poseidon(_bigints);
}

const derHard = (w: HDNodeWallet, index: number) => w.deriveChild(index + HARDENED_OFFSET);

type Secret = {
  nullifier: bigint;
  commitment: bigint;
  precommitment: bigint;
};

interface ISecretManager {
  getDepositSecrets: (index: number) => Secret;
  getWithdrawalSecrets: (depositIndex: number, index: number) => Secret;
}


type PrivacyPoolsDerivationPath = {
  chain: number;
  account: number;
  secretType: "salt" | "nullifier";
  deposit: number;
  withdraw?: number;
};

const ppPath = ({ chain, account, secretType, deposit, withdraw }: PrivacyPoolsDerivationPath) => {
  const _secretType = secretType === "nullifier" ? 0 : 1;
  const depositPath = `${PRIVACY_POOLS_PATH}/${chain}'/${account}'/${_secretType}'/${deposit}'`;
  if (withdraw) {
    return `${depositPath}/${withdraw}'`;
  } else {
    return depositPath;
  }
};

export function SecretManager(protocolSeed: Bytes, accountIndex: number = 0): ISecretManager {

  const wallet = HDNodeWallet.fromSeed(protocolSeed);

  const accountWallet = wallet.deriveChild(accountIndex + HARDENED_OFFSET);

  const accountMasterCommitment = accountWallet.deriveChild(0 + HARDENED_OFFSET);
  const accountMasterNullifier = accountWallet.deriveChild(1 + HARDENED_OFFSET);

  const deriveSecrets = (nullifierNode: HDNodeWallet, commitmentNode: HDNodeWallet, index: number) => {
    const nullifier = hashToSnarkField([derHard(nullifierNode, index).privateKey]);
    const commitment = hashToSnarkField([derHard(commitmentNode, index).privateKey]);
    const precommitment = hashToSnarkField([nullifier, commitment]);
    return { nullifier, commitment, precommitment };
  };

  const getDepositSecrets = (index: number) => {
    return deriveSecrets(accountMasterNullifier, accountMasterCommitment, index);
  };

  const getWithdrawalSecrets = (depositIndex: number, index: number) => {
    const depositNullifier = derHard(accountMasterNullifier, depositIndex);
    const depositCommitment = derHard(accountMasterCommitment, depositIndex);
    return deriveSecrets(depositNullifier, depositCommitment, index);
  };

  return {
    getDepositSecrets,
    getWithdrawalSecrets
  };
}
