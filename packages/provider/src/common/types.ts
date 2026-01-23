import { EthereumProvider } from "~/provider";
import { Bytes } from "./primitives.interface";

// Arbitrary network access for plugins
interface Network {
  // Network fetches (ie Window.fetch())
  fetch(url: string): Promise<unknown>;
}

// Persistant storage for plugins. Plugins should not pre-encrypt data when interacting with the storage, but rather rely on the wallet developers to use their own cross-platform storage primitives.
interface Storage {
  set(key: string, value: string): void;
  get(key: string): string | null;
}

// Keystore object from the wallet used to generate internally used cryptographic material.
// 
// TODO: Confirm if this works for everything. I think so?  TC classic can derive some custom path for "random" notes,
// railgun and privacy pools have their own derivation path, and I think TC nova uses BIP-32
//
//  - Railgun, (I think?) privacy pools, and (I think?) TC Nova use BIP-32 derivation paths that should be compatible.
//  - TC classic can derive custom paths as seeds for "random" notes (this means notes are derived from seed phrases, and so makes them transportable)
//  - Tongo uses regular private keys I think?  Unsure from their docs, but I'm pretty sure their SDK could work with this
interface Keystore {
  // Derives the specified path against the wallet's mnemonic and claims the specified path.
  // 
  // Returns an error if the path is already claimed.
  deriveAtPath(path: string): Bytes;
}

// Allows plugins to emit logs internally
type Log = Console;

export interface HostProviders {
    network: Network;
    keystore: Keystore;
    secureStorage: Storage;
    logger: Log;
    ethProvider: EthereumProvider;
}