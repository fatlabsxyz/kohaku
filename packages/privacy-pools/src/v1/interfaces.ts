import { Broadcaster } from "@kohaku-eth/plugins/broadcaster";
import { Plugin, Host, AssetAmount, ERC20AssetId, PluginInstance } from "@kohaku-eth/plugins";
import { IEntrypoint, INote, PPv1PrivateOperation, PPv1PublicOperation } from '../plugin/interfaces/protocol-params.interface.js';
import { Address } from 'ox/Address';

export type PPv1BroadcasterParameters = {
    broadcasterUrl: string | Record<string, string>;
};
export type PPv1Broadcaster = Broadcaster<PPv1BroadcasterParameters, PPv1PrivateOperation>;
export type PPv1PluginParameters = PPv1BroadcasterParameters & {
    entrypoint: IEntrypoint;
    ipfsUrl?: string;
};

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
    },
    {
        notes(assets: ERC20AssetId[], includeSpent?: boolean): Promise<INote[]>;
        ragequit(labels: INote['label'][]): Promise<PPv1PublicOperation>
    }
>;

export type PPv1Plugin = Plugin<"privacy-pools-v1", PPv1Instance, PPv1PrivateOperation, Host, PPv1Broadcaster, PPv1PluginParameters>;