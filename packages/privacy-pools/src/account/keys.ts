import { toBigInt } from 'ethers';
import { poseidon } from "maci-crypto/build/ts/hashing.js";
import { HostInterface } from '../types/host';

/** BIP32-BIP43 - Privacy Pools v1
 *   2**31
 *
 * m/purpose'/version'/account'/secretType'/deposit'/secretIndex'
 *   secretIndex: 0 = deposit secret, 1+ = withdrawal secrets
 *   PH[secret(N|C), entrypointAddress] -> circuit
 */

const PRIVACY_POOLS_PATH = "m/28784'/1'";

export type Secret = {
  nullifier: bigint;
  salt: bigint;
  precommitment: bigint;
};

type BaseDeriveSecretParams = {
  entrypointAddress: string;
  chainId: number;
};

type DeriveDepositSecretParams = BaseDeriveSecretParams & {
  depositIndex: number;
};

type DeriveWithdrawalSecretsParams = BaseDeriveSecretParams & {
  depositIndex: number;
  withdrawIndex: number;
};

type DeriveSecretsParams = BaseDeriveSecretParams & {
  depositIndex: number;
  secretIndex: number;
};

export interface ISecretManager {
  getDepositSecrets: (params: DeriveDepositSecretParams) => Secret;
  getSecrets: (params: DeriveWithdrawalSecretsParams) => Secret;
}

export interface SecretManagerParams {
  host: HostInterface,
  accountIndex?: number;
}

export function SecretManager({
  host: { keystore },
  accountIndex = 0
}: SecretManagerParams): ISecretManager {

  const deriveSecrets = ({ chainId, entrypointAddress, depositIndex, secretIndex }: DeriveSecretsParams) => {
    const saltSecret = keystore.deriveAtPath(ppPath({ secretType: "salt", accountIndex, depositIndex, secretIndex }));
    const nullifierSecret = keystore.deriveAtPath(ppPath({ accountIndex, secretType: "nullifier", depositIndex, secretIndex }));
    const nullifier = hashToSnarkField([BigInt(chainId), toBigInt(entrypointAddress), toBigInt(nullifierSecret)]);
    const salt = hashToSnarkField([BigInt(chainId), toBigInt(entrypointAddress), toBigInt(saltSecret)]);
    const precommitment = hashToSnarkField([nullifier, salt]);

    return { nullifier, salt, precommitment };
  };

  const getDepositSecrets = ({ entrypointAddress, chainId, depositIndex }: DeriveDepositSecretParams) => {
    return deriveSecrets({ entrypointAddress, chainId, depositIndex, secretIndex: 0 });
  };

  const getSecrets = ({ entrypointAddress, chainId, depositIndex, withdrawIndex }: DeriveWithdrawalSecretsParams) => {
    return deriveSecrets({ entrypointAddress, chainId, depositIndex, secretIndex: withdrawIndex });
  };

  return {
    getDepositSecrets,
    getSecrets
  };

}

type PrivacyPoolsDerivationPath = {
  accountIndex: number;
  secretType: "salt" | "nullifier";
  depositIndex: number;
  secretIndex: number;
};

function ppPath({ accountIndex, secretType, depositIndex, secretIndex }: PrivacyPoolsDerivationPath) {
  const _secretType = secretType === "nullifier" ? 0 : 1;

  return `${PRIVACY_POOLS_PATH}/${accountIndex}'/${_secretType}'/${depositIndex}'/${secretIndex}'`;
}

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
