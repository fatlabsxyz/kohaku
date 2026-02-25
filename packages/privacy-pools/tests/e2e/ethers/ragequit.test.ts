import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { Eip155ChainId, Erc20Id } from '@kohaku-eth/plugins';
import { ethers } from '@kohaku-eth/provider/ethers';

import { E_ADDRESS } from '../../../src/config/constants';
import { MAINNET_CONFIG } from '../../../src/config/index';
import { ANVIL_PORT, defineAnvil, type AnvilInstance } from '../../utils/anvil';
import { getEnv, InitialState } from '../../utils/common';
import { createMockHost } from '../../utils/mock-host';
import { TEST_ACCOUNTS } from '../../utils/test-accounts';
import { assetVettingFee, deductVettingFees, getProtocolWithState, sendTxAndWait, setupWallet } from '../../utils/test-helpers';

describe('PrivacyPools v1 E2E Flow', () => {
  let anvil: AnvilInstance;
  let latestState: InitialState;

  const MAINNET_FORK_URL = getEnv('MAINNET_RPC_URL', 'https://no-fallback');
  const MAINNET_CHAIN_ID = new Eip155ChainId(1);
  const ENTRYPOINT_ADDRESS = BigInt(MAINNET_CONFIG.ENTRYPOINT_ADDRESS);

  beforeAll(async () => {

    anvil = defineAnvil({
      forkUrl: MAINNET_FORK_URL,
      port: ANVIL_PORT + 1,
      chainId: 1,
    });

    await anvil.start();

    const _protocol = getProtocolWithState();
    await _protocol.syncAll();
    latestState = _protocol.dumpState();

  }, 300_000);

  afterAll(async () => {
    await anvil.stop();
  });

  it('[prepareShield] executes successful deposit on forked mainnet', async () => {
    const pool = anvil.pool(31);
    const provider = ethers(await pool.getProvider());
    const alice = await setupWallet(pool, TEST_ACCOUNTS.alice.privateKey);
    const bob = await setupWallet(pool, TEST_ACCOUNTS.bob.privateKey);

    // Create host with pool-specific RPC URL
    const protocol = getProtocolWithState({
      host: createMockHost(undefined, pool.rpcUrl),
      initialState: latestState
    });

    // E_ADDRESS represents native ETH in Privacy Pools
    const nativeAsset = new Erc20Id(E_ADDRESS, MAINNET_CHAIN_ID);
    const DEPOSIT_AMOUNT = 1000000000000000000n; // 1 ETH

    // 1. Check initial balance is 0
    const initialBalancesUnapproved = await protocol.balance([nativeAsset], "unapproved");
    expect(initialBalancesUnapproved[0].amount).toBe(0n);

    for (let _i in Array(3).fill(null)) {
      // 2. Prepare and execute deposit
      const { txns: [tx] } = await protocol.prepareShield(
        { asset: nativeAsset, amount: DEPOSIT_AMOUNT }
      );

      const txReceipt = await sendTxAndWait(alice, tx);
      expect(txReceipt).toBeTruthy();
      expect(txReceipt?.status).toBe(1); // Success
      await pool.mine(1);
    }

    // 3. Verify state after deposit
    const postDepositBalances = await protocol.balance([nativeAsset], 'unapproved');

    const vettingFees = await assetVettingFee(alice, ENTRYPOINT_ADDRESS, nativeAsset);
    const DEPOSIT_AMOUNT_AFTER_EP_FEE = deductVettingFees(DEPOSIT_AMOUNT, vettingFees);
    expect(postDepositBalances[0].amount).toBe(3n * DEPOSIT_AMOUNT_AFTER_EP_FEE);

    const notes = await protocol.notes([nativeAsset]);
    expect(notes.length).toEqual(3);

    const ragequitTxs = await protocol.ragequit(notes.map(n => n.label));
    expect(ragequitTxs.txns.length).toEqual(3);

    ragequitTxs.txns.map(({ to, data }) => {
      // mainnet ethereum pool
      expect(to.toLowerCase()).toEqual("0xF241d57C6DebAe225c0F2e6eA1529373C9A9C9fB".toLowerCase());
      expect(data).toBeDefined();
      expect(data.startsWith("0x")).toBeTruthy();
    });

    const [tx1, tx2, tx3] = ragequitTxs.txns;

    // alice should be the only one with ragequit authority
    for (const tx of [tx1, tx2]) {
      const txReceipt = await sendTxAndWait(alice, tx);
      expect(txReceipt).toBeTruthy();
      expect(txReceipt?.status).toBe(1); // Success
      await pool.mine(1);
    }

    // bob cant ragequit alice's deposit
    const txReceipt = await sendTxAndWait(bob, tx3);
    expect(txReceipt).toBeTruthy();
    expect(txReceipt?.status).toBe(0); // Failure
    console.log(txReceipt)

  }, { timeout: 120_000 });

});
