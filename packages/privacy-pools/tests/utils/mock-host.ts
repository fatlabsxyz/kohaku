import { HDNodeWallet, Mnemonic } from 'ethers';
import { Host, Keystore } from '@kohaku-eth/plugins';

export const TEST_MNEMONIC = 'test test test test test test test test test test test junk';

// Keystore implementation using ethers HDNodeWallet for proper BIP32 derivation
export function createMockKeystore(phrase: string = TEST_MNEMONIC): Keystore {
  // Create root HD node from mnemonic (depth 0)
  const mnemonic = Mnemonic.fromPhrase(phrase);
  const masterNode = HDNodeWallet.fromSeed(mnemonic.computeSeed());

  // XXX: unused
  const deriveAtBytes = (path: string) => {
    const derived = masterNode.derivePath(path);
    // Return the private key as bytes (32 bytes)
    return Uint8Array.from(Buffer.from(derived.privateKey.slice(2), 'hex'));
  };

  return {
    deriveAt(path: string) {
      const derived = masterNode.derivePath(path);
      // Return the private key as hex (32 bytes)
      return derived.privateKey as `0x${string}`;
    }
  };
}

export function createMockHost(mnemonic?: string): Partial<Host> {
  return {
    keystore: createMockKeystore(mnemonic)
  };
}
