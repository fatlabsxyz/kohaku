import type { Address, Hex, TypedDataDefinition } from 'viem';
import type { Broadcaster } from "@kohaku-eth/plugins/broadcaster";
import type { PrivateOperation, AssetAmount, PluginInstance, ERC20AssetId } from "@kohaku-eth/plugins";

/**
 * PPv2 uses Ethereum Addresses internally
 */
export type PPv2Address = Address;

/**
 * Signs the v2 `SecretDerivation` typed data. Its address is the account owner,
 * the EOA that sends the account's public operations.
 */
export type V2Signer = {
    getAddress: () => Promise<Address>;
    signTypedData: (typedData: TypedDataDefinition) => Promise<Hex>;
};

/**
 * - `signer`: keys come from a `SecretDerivation` signature. Without a signer, a software
 *   signer is derived from the host keystore.
 * - `account-key`: the base64 account key exported by the canonical v2 app
 *   (`{ kind: 'ppv2-account-key', v: 1, address, signature }`). Its `legacySignature`, if any, is ignored.
 */
export type PPv2Credential = {
    type: 'signer';
    signer?: V2Signer;
} | {
    type: 'account-key';
    accountKey: string;
};

export type PPv2AssetAmount = AssetAmount<ERC20AssetId, bigint, 'spendable' | 'unspendable'>;

export type PPv2Instance = PluginInstance<
    PPv2Address,
    {
        assetAmounts: {
            input: PPv2AssetAmount,
            internal: PPv2AssetAmount,
            output: PPv2AssetAmount,
            read: PPv2AssetAmount,
        },
        credential: PPv2Credential,
        privateOp: PPv2PrivateOperation,
        features: {
            prepareShield: true,
            prepareShieldMulti: true,
            prepareTransfer: true,
            prepareTransferMulti: true,
            prepareUnshield: true,
            prepareUnshieldMulti: true,
        }
    }
>;

export type PPv2BroadcasterParameters = {
    broadcasterUrl: string;
    // TODO: add remaining url params
};
export type PPv2PrivateOperation = PrivateOperation & { bar: 'hi' };
export type PPv2Broadcaster = Broadcaster<PPv2BroadcasterParameters>;
export type PPv2PluginParameters = { foo: 'bar' }; // TODO: add deployment params
