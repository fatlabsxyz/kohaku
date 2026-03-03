import { IKeystoreManager, KeystoreManagerParams } from "./interfaces";

export function defaultKeystoreManagerFactory({
    host: { keystore },
    groupOrder = BN254_GROUP_ORDER,
    accountIndex = 0
}: KeystoreManagerParams): IKeystoreManager {
    const deriveKey = () => {
        return BigInt(keystore.deriveAt("m/701160/"/*TONGO*/+accountIndex)) % groupOrder;
    };
    return { deriveKey };
}

const BN254_GROUP_ORDER = 0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001n;
