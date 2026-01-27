import { Address, isAddress } from "viem";
import { InvalidAddressError, UnsupportedChainError } from "./errors";

/**
 * CAIP-2 Chain ID.
 * 
 * https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-2.md
 * 
 *  - EVM chains represent public blockchains.
 *  - Custom chains may be used by plugins to represent private chains (IE 
 * `RAILGUN:1` for railgun assets on Ethereum mainnet).
 */
export type ChainId =
    | { kind: "Evm"; chainId: bigint; }
    | { kind: "Custom"; namespace: string; reference: string; };

/**
 * CAIP-19 Asset ID.
 * 
 * https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-19.md
 * 
 * - Slip44 assets represent native assets of blockchains (IE ETH on Ethereum,
 *   MATIC on Polygon).
 * - Erc20 assets represent fungible tokens.
 * - Erc721 assets represent non-fungible tokens.
 * 
 */
export interface AssetId {
    chainId: ChainId;
    assetType: { kind: "Slip44"; coinType: number }
    | { kind: "Erc20"; address: Address }
    | { kind: "Erc721"; address: Address };
}

/**
 * CAIP-10 Account ID.
 * 
 * https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-10.md
 */
export interface AccountId {
    chainId: ChainId;
    accountId: string;
}

export function newEvmChainId(chainId: number): ChainId {
    return { kind: "Evm", chainId };
}

export function newEvmErc20(chainId: number, address: Address): AssetId {
    return {
        chainId: { kind: "Evm", chainId },
        assetType: { kind: "Erc20", address },
    };
}

export function newEvmNative(chainId: number): AssetId {
    return {
        chainId: { kind: "Evm", chainId },
        assetType: { kind: "Slip44", coinType: 60 },
    };
}

/**
 * Converts an AccountId to an EVM address.
 * 
 * @throws Error if the chain ID is not EVM or the account ID is not a valid EVM address.
 */
export function accountIdToAddress(accountId: AccountId): Address {
    if (accountId.chainId.kind !== "Evm") {
        throw new UnsupportedChainError(accountId.chainId);
    }

    const address = accountId.accountId as Address;
    if (!isAddress(address)) {
        throw new InvalidAddressError(address);
    }
    return address;
}
