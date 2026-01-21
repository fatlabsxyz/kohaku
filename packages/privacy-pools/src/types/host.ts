import { Bytes } from "./base";

// Keystore object from the wallet used to generate internally used cryptographic material.
export interface Keystore {
  // Derives the specified path against the wallet's mnemonic and claims the specified path.
  // 
  // Returns an error if the path is already claimed.
  deriveAtPath(path: string): Bytes;
}

export interface HostInterface {
  keystore: Keystore;
};
