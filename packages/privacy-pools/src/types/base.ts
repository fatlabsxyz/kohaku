import { AssetId, ChainId } from "@kohaku-eth/plugins";

export type EvmChainId = Exclude<ChainId, { kind: "Custom" }>;

export type EvmAssetId = AssetId & { chainId: { kind: "Evm" } };
