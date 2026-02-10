import { Eip155ChainId } from "@kohaku-eth/plugins";
import { MAINNET_CONFIG } from "../../src";

// Helper to get environment variable with fallback
export function getEnv(key: string, fallback: string): string {
  if (typeof process.env[key] === 'string' && process.env[key]) {
    return process.env[key] as string;
  }

  return fallback;
}

export const MAINNET_ENTRYPOINT = {
  chainId: new Eip155ChainId(1),
  address: BigInt(MAINNET_CONFIG.ENTRYPOINT_ADDRESS),
  deploymentBlock: 22153713n,
}