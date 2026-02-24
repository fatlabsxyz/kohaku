import { Address } from 'ox/Address';
import { AssetAmount, ERC20AssetId, PluginInstance } from '@kohaku-eth/plugins';
import { PPv1PrivateOperation, PPv1PublicOperation } from '../plugin/interfaces/protocol-params.interface';

/**
 * PPv1 uses Ethereum Addresses internally
 */
export type PPv1Address = Address;

export type PPv1AssetAmount = AssetAmount<ERC20AssetId>;
export type PPv1AssetBalance = PPv1AssetAmount & {
    pendingAmount: bigint;
}

export type PPv1Instance = PluginInstance<
    PPv1Address,
    {
        input: PPv1AssetAmount,
        internal: PPv1AssetAmount,
        output: PPv1AssetAmount,
        balance: PPv1AssetBalance,
    },
    PPv1PublicOperation,
    PPv1PrivateOperation,
    {
        prepareShield: true,
        prepareUnshield: true,
    }
>;
