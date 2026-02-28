import { type ERC20AssetId } from '@kohaku-eth/plugins';
import { readFileSync, existsSync } from "node:fs";
import { MAINNET_CONFIG } from "../../src";
import type { RootState } from "../../src/state/store";
import { getAddress } from 'viem';

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
    const state = JSON.parse(rawState) as InitialState;
    Object.entries(state).forEach(([key, val]) => console.log("Last synced block:", key, Number(val.sync.lastSyncedBlock)));
    console.log(`[loadInitialState] Loaded state file succesfully from ${statePath}`);
    return state;
  } catch (error) {
    console.warn(`[loadInitialState] Failed to load state from ${statePath}:`, error);
    return {};
  }
}

export const MAINNET_ENTRYPOINT = {
  address: BigInt(MAINNET_CONFIG.ENTRYPOINT_ADDRESS),
  deploymentBlock: 22153713n,
};

export function ERC20AssetId(address: string): ERC20AssetId {
  return {
    contract: getAddress(address),
    __type: 'erc20'
  };
}
