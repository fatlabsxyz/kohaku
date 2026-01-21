import { HDNodeWallet, Wallet, keccak256, concat, toUtf8Bytes, getBytes } from 'ethers';

/** BIP32-BIP43 - Privacy Pools v1
 *                                                LABEL >>>
 * m/purpose'/version'/account'/ -- /secret_type'/deposit'   /withdraw
 *                                                  L-> PH[depositSecret(N|C), entrypointAddress] -> circuit
 *                                                              L-> PH[withdrawSecret(N|C), entrypointAddress] -> circuit
 */
// m/28784'/1'/3'/0'/n' | -> precomm
// m/28784'/1'/3'/1'/n' |

// m/28784'/1'/3'/0'/6' < 10 usd
// m/28784'/1'/3'/0'/6'/0 < -5 usd
//
// m/28784'/1'/3'/0'/7' < 5 usd
//
// deposit (+1)
// m/28784'/1'/3'/0'/6'+1/4 <
//
// m/28784'/1'/3'/0'/DEPOSIT === 0xCaFe ;
// m/28784'/1'/3'/1'/DEPOSIT === 0xAbEd ;
// Nodo(0xCaFe).derive(1)
// Nodo(0xAbEd).derive(1)
// precommitment <- PH[commitment|nullifier]
//
// label <- PH[scope, nonce]

const PRIVACY_POOLS_PATH = "m/28784'/1'";
const HARDENED_OFFSET = 0x80000000

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

  const derivedMasterCommitment = derivedWallet.deriveChild(0 + HARDENED_OFFSET)
  const derivedMasterNullifier = derivedWallet.deriveChild(1 + HARDENED_OFFSET)

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
