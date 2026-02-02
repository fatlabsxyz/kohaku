export type Option = 
  | { kind: "text"; label: string; }
  | { kind: "select"; label: string; options: string[]; };

export type Address = string;
export type U256 = bigint;
export type Bytes = Uint8Array;

export interface EvmChainId { kind: "Evm"; chainId: bigint; }
export interface CustomChainId { kind: "Custom"; namespace: string; reference: string; }

export type ChainId =
  | EvmChainId
  | CustomChainId;

export interface AssetId {
  chainId: ChainId;
  assetType: AssetType;
}

export interface AccountId {
  chainId: ChainId;
  accountId: string;
}

export interface Slip44Asset { kind: "Slip44"; coinType: bigint }
export interface Erc20Asset { kind: "Erc20"; address: Address }
export interface Erc721Asset { kind: "Erc721"; address: Address }

export type AssetType =
  | Slip44Asset
  | Erc20Asset
  | Erc721Asset;
