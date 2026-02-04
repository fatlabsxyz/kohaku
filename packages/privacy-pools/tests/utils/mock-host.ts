import { HDNodeWallet, Mnemonic } from 'ethers';
import { EthProvider, Host, Keystore, Storage as PluginStorage, SecretStorage as PluginSecretStorage } from '@kohaku-eth/plugins';
import { createPublicClient, http } from 'viem';

export const TEST_MNEMONIC = 'test test test test test test test test test test test junk';

// Keystore implementation using ethers HDNodeWallet for proper BIP32 derivation
export function createMockKeystore(phrase: string = TEST_MNEMONIC): Keystore {
  // Create root HD node from mnemonic (depth 0)
  const mnemonic = Mnemonic.fromPhrase(phrase);
  const masterNode = HDNodeWallet.fromSeed(mnemonic.computeSeed());

  return {
    deriveAt(path: string) {
      const derived = masterNode.derivePath(path);

      // Return the private key as hex (32 bytes)
      return derived.privateKey as `0x${string}`;
    }
  };
}

const createMockStorage = (): PluginStorage => {
  const storageMap = new Map<string, string>();
  return {
    _brand: "Storage",
    set: storageMap.set,
    get: (key) => storageMap.get(key) || null,
  };
};

const createMockSecretStorage = (): PluginSecretStorage => {
  const storageMap = new Map<string, string>();
  return {
    _brand: "SecureStorage",
    set: storageMap.set,
    get: (key) => storageMap.get(key) || null,
  };
};

const createEthProvider = (rpcUrl = 'http://127.0.0.1:8545'): EthProvider => {
  const publicClient = createPublicClient({ transport: http(rpcUrl) });

  return {
    request: publicClient.request as never
  };
};

export function createMockHost(mnemonic?: string, rpcUrl = 'http://127.0.0.1:8545'): Host {
  return {
    keystore: createMockKeystore(mnemonic),
    network: { fetch },
    storage: createMockStorage(),
    secretStorage: createMockSecretStorage(),
    ethProvider: createEthProvider(rpcUrl),
    // log: console
  };
}
