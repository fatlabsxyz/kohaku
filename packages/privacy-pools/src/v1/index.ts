import { CreatePluginFn } from "@kohaku-eth/plugins";
import { PrivacyPoolsBroadcaster, PrivacyPoolsV1Protocol } from "../plugin";
import { PPv1Instance } from "./instance";
import { PPv1Plugin } from "./interfaces";

 
export const createPPv1Plugin: CreatePluginFn<PPv1Plugin> = (host, params) => {
  let instance: PPv1Instance | null = null;
  const broadcaster = new PrivacyPoolsBroadcaster({
    host,
  });

export type PPv1AssetAmount = AssetAmount<ERC20AssetId, bigint, 'spendable' | 'unspendable'>;

export type PPv1Credential = {
    type: 'private-key';
    privateKey: string;
    accountIndex: number;
} | {
    type: 'mnemonic';
    mnemonic: string;
    accountIndex: number;
};

export type PPv1Instance = PluginInstance<
    PPv1Address,
    {
        credential: PPv1Credential,
        assetAmounts: {
            input: PPv1AssetAmount,
            internal: PPv1AssetAmount,
            output: PPv1AssetAmount,
            read: PPv1AssetAmount,
        },
        privateOp: PPv1PrivateOperation,
        features: {
            prepareShield: true,
            prepareShieldMulti: true,
            prepareUnshield: true,
            prepareUnshieldMulti: true,
        },
    }
    const broadcasterUrl = params.broadcasterUrl;
    const relayersList =
      typeof broadcasterUrl === "string"
        ? { default: broadcasterUrl }
        : broadcasterUrl;
    instance = new PrivacyPoolsV1Protocol(host, {
      ...params,
      relayersList,
    });
    await broadcaster.config(params);
    return instance;
  };

export type PPv1BroadcasterParameters = {
    broadcasterUrl: string;
    // TODO: add remaining url params
};
export type PPv1PrivateOperation = PrivateOperation & { bar: 'hi' };
export type PPv1Broadcaster = Broadcaster<PPv1BroadcasterParameters>;
export type PPv1PluginParameters = { foo: 'bar' }; // TODO: add deployment params 

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const createPPv1Plugin: CreatePluginFn<PPv1Instance, PPv1PluginParameters> = (host, params) => {
    // setup privacy pools v1 plugin here
    const pubKey = "" as Address;

    return {
        instanceId: () => Promise.resolve(pubKey),
        balance: async () => {
            return [
                {
                    asset: {
                        __type: 'erc20',
                        contract: '0x0000000000000000000000000000000000000000',
                    },
                    amount: 0n,
                    tag: 'unspendable',
                },
                {
                    asset: {
                        __type: 'erc20',
                        contract: '0x0000000000000000000000000000000000000000',
                    },
                    amount: 0n,
                    tag: 'spendable',
                },
                {
                    asset: {
                        __type: 'erc20',
                        contract: '0x0000000000000000000000000000000000000000',
                    },
                    amount: 0n,
                },
            ]
        },
        prepareShield: () => Promise.resolve({} as PublicOperation),
        prepareShieldMulti: () => Promise.resolve({} as PublicOperation),
        prepareUnshield: () => Promise.resolve({} as PPv1PrivateOperation),
        prepareUnshieldMulti: () => Promise.resolve({} as PPv1PrivateOperation),
    };
};
