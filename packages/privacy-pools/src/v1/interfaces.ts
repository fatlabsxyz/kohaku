import { Broadcaster } from "@kohaku-eth/plugins/broadcaster";
import { AssetAmount, ERC20AssetId, PluginInstance } from "@kohaku-eth/plugins";
import { IEntrypoint, INote, PPv1PrivateOperation, PPv1PublicOperation } from '../plugin/interfaces/protocol-params.interface.js';
import { Address } from 'ox/Address';

export type PPv1BroadcasterParameters = {
    broadcasterUrl: string | Record<string, string>;
};
export type PPv1Broadcaster = Broadcaster<PPv1BroadcasterParameters, PPv1PrivateOperation>;
export interface PPv1PluginParameters extends PPv1BroadcasterParameters, PPv1BaseCredential {
    entrypoint: IEntrypoint;
    ipfsUrl?: string;
};
export interface PPv1PluginWithMnemonicParameters extends PPv1PluginParameters {
    mnemonic: string;
}

export type PPv1Address = Address;

export type PPv1AssetAmount = AssetAmount<ERC20AssetId>;
export type PPv1AssetBalance = PPv1AssetAmount & {
    pendingAmount: bigint;
}

interface PPv1BaseCredential {
    accountIndex: number;
}
export interface PPv1NativeCredential extends PPv1BaseCredential {
    type: 'native';
}

export interface PPv1MnemonicCretendial extends PPv1BaseCredential {
    type: 'mnemonic';
    mnemonic: string;
}

export type PPv1Credentials = PPv1NativeCredential | PPv1MnemonicCretendial;

type PPv1InsanceFactory<Credential extends PPv1Credentials> = PluginInstance<
    PPv1Address,
    {
        credential: Credential,
        features: {
            prepareShield: true,
            prepareUnshield: true,
        },
        assetsAmounts: {
            input: PPv1AssetAmount,
            internal: PPv1AssetAmount,
            output: PPv1AssetAmount,
        },
        extraFeatures: {
            notes(assets: ERC20AssetId[], includeSpent?: boolean): Promise<INote[]>;
            ragequit(labels: INote['label'][]): Promise<PPv1PublicOperation>
        }
        publicOp: PPv1PublicOperation,
        privateOp: PPv1PrivateOperation
    }
>;

export type PPv1Instance = PPv1InsanceFactory<PPv1NativeCredential>;
export type PPv1LegacyInstance = PPv1InsanceFactory<PPv1MnemonicCretendial>;
