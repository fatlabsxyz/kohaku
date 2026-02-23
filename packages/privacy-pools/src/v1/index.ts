import { CreatePluginFn } from "@kohaku-eth/plugins";
import { PrivacyPoolsBroadcaster, PrivacyPoolsV1Protocol } from "../plugin";
import { PPv1Instance } from "./instance";
import { PPv1Plugin, PPv1PluginParameters } from "./interfaces";

 
export const createPPv1Plugin: CreatePluginFn<PPv1Plugin> = (host, params) => {
    const actualParams = params as PPv1PluginParameters;
    // setup privacy pools v1 plugin here

    // ppv1 supports single instance
    let instance: PPv1Instance | null = null;
    const broadcaster = new PrivacyPoolsBroadcaster({
        host,
    });

    const createInstance = () => {
        if (instance) {
            return instance;
        }
        instance = new PrivacyPoolsV1Protocol(host, actualParams);
        return instance;
    }

    return {
        instances: () => [instance].filter(a => !!a),
        createInstance,
        broadcaster,
        plugin_name: "privacy-pools-v1",
        params,
    };
};
