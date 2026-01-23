import { HDNodeWallet, Mnemonic } from 'ethers';
import { HostInterface, Keystore } from '../../src/types/host';
import { Bytes } from '../../src/types/base';

export const TEST_MNEMONIC = 'test test test test test test test test test test test junk';

// Keystore implementation using ethers HDNodeWallet for proper BIP32 derivation
export function createMockKeystore(phrase: string = TEST_MNEMONIC): Keystore {
  // Create root HD node from mnemonic (depth 0)
  const mnemonic = Mnemonic.fromPhrase(phrase);
  const masterNode = HDNodeWallet.fromSeed(mnemonic.computeSeed());

  return {
    deriveAtPath(path: string): Bytes {
      const derived = masterNode.derivePath(path);

      // Return the private key as bytes (32 bytes)
      return Uint8Array.from(Buffer.from(derived.privateKey.slice(2), 'hex'));
    }
  };
}

export function createMockHost(mnemonic?: string): HostInterface {
  return {
    keystore: createMockKeystore(mnemonic)
  };
}
