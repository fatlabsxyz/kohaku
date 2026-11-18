import type { CreatePluginFn, PublicOperation } from "@kohaku-eth/plugins";
import type { PPv2Address, PPv2Instance, PPv2PluginParameters, PPv2PrivateOperation } from './interfaces';

export type * from './interfaces';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const createPPv2Plugin: CreatePluginFn<PPv2Instance, PPv2PluginParameters> = (host, params) => {
    // setup privacy pools v2 plugin here
    const pubKey = "" as unknown as PPv2Address;

    return {
        instanceId: () => Promise.resolve(pubKey),
        balance: () => Promise.resolve([]),
        prepareShield: () => Promise.resolve({} as PublicOperation),
        prepareShieldMulti: () => Promise.resolve({} as PublicOperation),
        prepareTransfer: () => Promise.resolve({} as PPv2PrivateOperation),
        prepareTransferMulti: () => Promise.resolve({} as PPv2PrivateOperation),
        prepareUnshield: () => Promise.resolve({} as PPv2PrivateOperation),
        prepareUnshieldMulti: () => Promise.resolve({} as PPv2PrivateOperation),
    };
};
