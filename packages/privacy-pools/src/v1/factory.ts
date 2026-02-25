import { CreatePluginFn } from "@kohaku-eth/plugins";
import { PrivacyPoolsBroadcaster, PrivacyPoolsV1Protocol } from "../plugin";
import { PPv1Plugin, PPv1Instance } from "./interfaces";

export const createPPv1Plugin: CreatePluginFn<PPv1Plugin> = (host, params) => {
  let instance: PPv1Instance | null = null;
  const broadcaster = new PrivacyPoolsBroadcaster({
    host,
  });

  const createInstance = async () => {
    if (instance) {
      return instance;
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

  return {
    instances: () => [instance].filter((a) => !!a),
    createInstance,
    broadcaster,
    plugin_name: "privacy-pools-v1",
    params,
  };
};
