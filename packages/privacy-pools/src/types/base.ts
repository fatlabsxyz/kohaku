import { ChainId } from "@kohaku-eth/plugins";

export type EvmChainId = Exclude<ChainId, { kind: "Custom" }>;
