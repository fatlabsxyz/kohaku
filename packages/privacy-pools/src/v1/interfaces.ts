import { PPv1Instance } from './instance.js';
import { Broadcaster } from "@kohaku-eth/plugins/broadcaster";
import { Plugin, Host } from "@kohaku-eth/plugins";
import { IEntrypoint, PPv1PrivateOperation } from '../plugin/interfaces/protocol-params.interface.js';

export type PPv1BroadcasterParameters = {
    broadcasterUrl: string | Record<string, string>;
};
export type PPv1Broadcaster = Broadcaster<PPv1BroadcasterParameters, PPv1PrivateOperation>;
export type PPv1PluginParameters = PPv1BroadcasterParameters & {
    entrypoint: IEntrypoint;
    ipfsUrl?: string;
}; // TODO: add deployment params 
export type PPv1Plugin = Plugin<"privacy-pools-v1", PPv1Instance, PPv1PrivateOperation, Host, PPv1Broadcaster, PPv1PluginParameters>;
