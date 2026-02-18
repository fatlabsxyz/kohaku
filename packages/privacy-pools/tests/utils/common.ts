import { readFileSync, existsSync } from "node:fs";
import { Eip155ChainId } from "@kohaku-eth/plugins";
import { MAINNET_CONFIG } from "../../src";
import type { RootState } from "../../src/state/store";

// Helper to get environment variable with fallback
export function getEnv(key: string, fallback: string): string {
  if (typeof process.env[key] === 'string' && process.env[key]) {
    return process.env[key] as string;
  }

  return fallback;
}

export type InitialState = Record<string, RootState>;

const PPV1_E2E_STATE_PATH_ENV = 'PPV1_E2E_STATE_PATH';

/**
 * Loads and parses initial state from a file path specified by the
 * PPV1_E2E_STATE_PATH environment variable.
 *
 * @returns Parsed state object ready to be injected into the plugin,
 *          or an empty object if the env var is not set or the file
 *          cannot be loaded/parsed.
 */
export function loadInitialState(): InitialState {
  const statePath = process.env[PPV1_E2E_STATE_PATH_ENV];

  if (!statePath) {
    return {};
  }

  try {
    if (!existsSync(statePath)) {
      console.warn(`[loadInitialState] State file not found: ${statePath}`);
      return {};
    }

    const rawState = readFileSync(statePath, 'utf-8');
    return JSON.parse(rawState) as InitialState;
  } catch (error) {
    console.warn(`[loadInitialState] Failed to load state from ${statePath}:`, error);
    return {};
  }
}

export const MAINNET_ENTRYPOINT = {
  chainId: new Eip155ChainId(1),
  address: BigInt(MAINNET_CONFIG.ENTRYPOINT_ADDRESS),
  deploymentBlock: 22153713n,
}
