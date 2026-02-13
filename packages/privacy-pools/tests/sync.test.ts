import * as fs from "fs";

import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

import { Eip155ChainId, Erc20Id } from '@kohaku-eth/plugins';

import { E_ADDRESS } from '../src/config/constants';
import { MAINNET_CONFIG } from '../src/config/index';
import { PrivacyPoolsV1Protocol } from '../src/index';
import { defineAnvil, type AnvilInstance } from './utils/anvil';
import { getEnv, loadInitialState, MAINNET_ENTRYPOINT } from './utils/common';
import { createMockAspService } from './utils/mock-asp-service';
import { createMockHost } from './utils/mock-host';
import { mockProverFactory } from './utils/mock-prover';
import { createMockRelayerClient } from './utils/mock-relayer';
import { TEST_ACCOUNTS } from './utils/test-accounts';
import { assetVettingFee, setupWallet } from './utils/test-helpers';

describe("Creates the dump state payload", () => {
  let anvil: AnvilInstance;

  const MAINNET_FORK_URL = getEnv('MAINNET_RPC_URL', 'https://no-fallback');
  const MAINNET_CHAIN_ID = new Eip155ChainId(1);
  const ENTRYPOINT_ADDRESS = BigInt(MAINNET_CONFIG.ENTRYPOINT_ADDRESS);

  const nativeAsset = new Erc20Id(E_ADDRESS, MAINNET_CHAIN_ID);
  let vettingFees = 0n;

  beforeAll(async () => {
    anvil = defineAnvil({
      forkUrl: MAINNET_FORK_URL,
      port: 8546,
      chainId: 1,
    });

    await anvil.start();
  }, 300000);

  afterAll(async () => {
    await anvil.stop();
  });

  beforeEach(async () => {
    const bob = await setupWallet(anvil.pool(1), TEST_ACCOUNTS.bob.privateKey);
    vettingFees = await assetVettingFee(bob, ENTRYPOINT_ADDRESS, nativeAsset);
  });

  it.skip("syncs", async () => {
    const pool = anvil.pool(10);
    const alice = await setupWallet(pool, TEST_ACCOUNTS.alice.privateKey);

    // Create mock asp
    const mockAspService = createMockAspService();
    mockAspService.addLabels([0n, 1n, 2n]);

    // Create mock relayer
    const mockRelayerClient = createMockRelayerClient({ feeBPS: '100' });

    const host = createMockHost(undefined, pool.rpcUrl);

    const protocol = new PrivacyPoolsV1Protocol(host, {
      chainsEntrypoints: {
        [MAINNET_CHAIN_ID.toString()]: MAINNET_ENTRYPOINT
      },
      proverFactory: mockProverFactory,
      relayersList: { 'mock-relayer': 'http://mock.relayer' },
      relayerClientFactory: () => mockRelayerClient,
      aspServiceFactory: () => mockAspService,
    });

    const nativeAsset = new Erc20Id(E_ADDRESS, MAINNET_CHAIN_ID);
    await protocol.balance([nativeAsset], "unapproved");

    const state = protocol.dumpState();

    const written = fs.writeFileSync("./state.json", JSON.stringify(state));

  }, { timeout: 0 });


  it("no missing state leaves", async () => {
    const initialState = loadInitialState();
    const oxbow = "eip155:1-594281462506414692893575336808578746593838263110";
    const state = initialState[oxbow];
    for (const [address, leaves] of state.poolsLeaves.poolLeavesTuples) {
      const indexes = leaves.map(([index, leaf]) => index).sort();
      console.log(address, indexes.length, Number(indexes[indexes.length - 1]));
    }
  });

});
