import { HDNodeWallet, Wallet, keccak256, concat, toUtf8Bytes, getBytes } from 'ethers';

export type KeyConfig =
  | { type: 'mnemonic'; mnemonic: string; accountIndex: number }
  | { type: 'key'; commitmentKey: string; nullifierKey: string };

export type DerivedKeys = {
  commitmentKey: Uint8Array;  // For generating commitments
  nullifierKey: Uint8Array;   // For generating nullifiers
  signer?: HDNodeWallet | Wallet;  // Ethereum signer (from mnemonic or private key)
};

// Derive keys from mnemonic using simple BIP44 derivation + hashing
export const deriveKeysFromMnemonic = (mnemonic: string, accountIndex: number): DerivedKeys => {
  // Use HDNodeWallet.fromPhrase which defaults to m/44'/60'/0'/0/0
  // For different account indices, we use the Mnemonic directly
  const wallet = HDNodeWallet.fromPhrase(mnemonic);

  // If non-zero accountIndex, derive child from the default path
  const derivedWallet = accountIndex === 0 ? wallet : wallet.deriveChild(accountIndex);

  // Derive commitment key: keccak256(privateKey + "commitment")
  const commitmentKey = getBytes(keccak256(concat([
    derivedWallet.privateKey,
    toUtf8Bytes('commitment')
  ])));

  // Derive nullifier key: keccak256(privateKey + "nullifier")
  const nullifierKey = getBytes(keccak256(concat([
    derivedWallet.privateKey,
    toUtf8Bytes('nullifier')
  ])));

  return { commitmentKey, nullifierKey, signer: derivedWallet };
};

// Use provided keys directly
export const deriveKeysFromPrivateKeys = (commitmentKey: string, nullifierKey: string): DerivedKeys => ({
  commitmentKey: getBytes(commitmentKey),
  nullifierKey: getBytes(nullifierKey),
  signer: undefined,
});

export const deriveKeys = (config: KeyConfig): DerivedKeys => {
  if (config.type === 'mnemonic') {
    return deriveKeysFromMnemonic(config.mnemonic, config.accountIndex);
  }

  return deriveKeysFromPrivateKeys(config.commitmentKey, config.nullifierKey);
};
