import { toBigInt } from 'ethers';
import { poseidon } from "maci-crypto/build/ts/hashing.js";
import { HostInterface } from '../types/host';

/** BIP32-BIP43 - Privacy Pools v1
 *   2**31
 *                                                LABEL >>>
 * m/purpose'/version'/account'/ -- /secret_type'/deposit'   /withdraw
 *                                                  L-> PH[depositSecret(N|C), entrypointAddress] -> circuit
 *                                                              L-> PH[withdrawSecret(N|C), entrypointAddress] -> circuit
 */

const PRIVACY_POOLS_PATH = "m/28784'/1'";

export type Secret = {
  nullifier: bigint;
  salt: bigint;
  precommitment: bigint;
};

type BaseDeriveSecretParams = {
  entrypointAddress: string;
  chainId: bigint;
}

type DeriveDepositSecretParams = BaseDeriveSecretParams & {
  depositIndex: number;
};

type DeriveWithdrawalSecretsParams = DeriveDepositSecretParams & {
  withdrawIndex: number;
};

type DeriveSecretsParams = DeriveDepositSecretParams & { withdrawIndex?: number; };

export interface ISecretManager {
  deriveSecrets: (params: DeriveSecretsParams) => Secret;
  getDepositSecrets: (params: DeriveDepositSecretParams) => Secret;
  getWithdrawalSecrets: (params: DeriveWithdrawalSecretsParams) => Secret;
}

export interface SecretManagerParams {
  host: HostInterface,
  accountIndex?: number;
}

export function SecretManager({
  host: { keystore },
  accountIndex = 0
}: SecretManagerParams): ISecretManager {

  const deriveSecrets = (deriveSecretParams: DeriveSecretsParams) => {
    const { chainId, entrypointAddress, ...depositWithdrawIdexes } = deriveSecretParams;
    const saltSecret = keystore.deriveAtPath(ppPath({ secretType: "salt", accountIndex, ...depositWithdrawIdexes }));
    const nullifierSecret = keystore.deriveAtPath(ppPath({ accountIndex, secretType: "nullifier", ...depositWithdrawIdexes }));
    const nullifier = hashToSnarkField([chainId, toBigInt(entrypointAddress), toBigInt(nullifierSecret)]);
    const salt = hashToSnarkField([chainId, toBigInt(entrypointAddress), toBigInt(saltSecret)]);
    const precommitment = hashToSnarkField([nullifier, salt]);

    return { nullifier, salt, precommitment };
  };

  const getDepositSecrets = (params: DeriveDepositSecretParams) => {
    return deriveSecrets(params);
  };

  const getWithdrawalSecrets = (params: DeriveWithdrawalSecretsParams) => {
    return deriveSecrets(params);
  };

  return {
    deriveSecrets,
    getDepositSecrets,
    getWithdrawalSecrets
  };

}

type PrivacyPoolsDerivationPath = {
  accountIndex: number;
  secretType: "salt" | "nullifier";
  depositIndex: number;
  withdrawIndex?: number;
};

function ppPath({ accountIndex, secretType, depositIndex, withdrawIndex }: PrivacyPoolsDerivationPath) {
  const _secretType = secretType === "nullifier" ? 0 : 1;
  const depositPath = `${PRIVACY_POOLS_PATH}/${accountIndex}'/${_secretType}'/${depositIndex}'`;

  if (withdrawIndex) {
    return `${depositPath}/${withdrawIndex}'`;
  } else {
    return depositPath;
  }
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
