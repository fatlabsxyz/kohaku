export type Option = 
  | { kind: "text"; label: string; }
  | { kind: "select"; label: string; options: string[]; };

// caip-style Account & Asset IDs.
export type Address = string;
export type U256 = bigint;
export type Bytes = Uint8Array;

export type ChainId =
  | { kind: "Evm"; chainId: bigint; }
  | { kind: "Custom"; namespace: string; reference: string; };

export interface AssetId {
  chainId: ChainId;
  assetType: AssetType;
}

export interface AccountId {
  chainId: ChainId;
  accountId: string;
}

export type AssetType =
  | { kind: "Slip44"; coinType: bigint }
  | { kind: "Erc20"; address: Address }
  | { kind: "Erc721"; address: Address };
