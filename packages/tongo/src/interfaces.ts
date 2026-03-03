import { AssetId, Host } from "@kohaku-eth/plugins";
import { Address } from "@kohaku-eth/provider";

export interface TongoPluginConfig {
    chain: number;
    groupOrder: bigint;
    accountIndex: number;
    deploys: Map<AssetId, Address>;
    keystoreManagerFactory: (params: KeystoreManagerParams) => IKeystoreManager
}

export interface KeystoreManagerParams {
    host: Host;
    groupOrder?: bigint;
    accountIndex?: number;
}

export interface IKeystoreManager {
    deriveKey: () => bigint;
}
