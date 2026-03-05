import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { E_ADDRESS } from '../../../src/config';
import { chainConfigSetup } from '../../constants';
import { defineAnvil, type AnvilInstance } from '../../utils/anvil';
import { ERC20Asset, InitialState, unwrapBalance } from '../../utils/common';
import { createMockHost } from '../../utils/mock-host';
import { TEST_ACCOUNTS } from '../../utils/test-accounts';
import { assetVettingFee, deductVettingFees, getProtocolWithState, sendTxAndWait, setupWallet } from '../../utils/test-helpers';

describe('PrivacyPools v1 E2E Flow', () => {
  let anvil: AnvilInstance;
  let latestState: InitialState;

  const chainId = 1;
  const {
    entrypoint,
    rpcUrl,
    forkBlockNumber,
  } = chainConfigSetup[chainId];

  const ENTRYPOINT_ADDRESS = entrypoint.entrypointAddress;
  // E_ADDRESS represents native ETH in Privacy Pools
  const nativeAsset = ERC20Asset(E_ADDRESS);
  let vettingFees: bigint;

  beforeAll(async () => {

    anvil = await defineAnvil({
      forkUrl: rpcUrl,
      forkBlockNumber: Number(forkBlockNumber),
      chainId,
    });

    await anvil.start();

    const pool = anvil.pool(1);
    const _protocol = getProtocolWithState({
      host: createMockHost({ mnemonic: undefined, rpcUrl: pool.rpcUrl })
    });

    await _protocol.sync();
    latestState = _protocol.dumpState();

    vettingFees = await assetVettingFee(await anvil.pool(1).getProvider(), ENTRYPOINT_ADDRESS, nativeAsset);

  }, 300_000);

  afterAll(async () => {
    await anvil.stop();
  });

  it('[ragequit] executes successful deposit on forked mainnet and ragequit several times', { timeout: 120_000 }, async () => {
    const pool = anvil.pool(31);
    const alice = await setupWallet(pool, TEST_ACCOUNTS.alice.privateKey);
    const bob = await setupWallet(pool, TEST_ACCOUNTS.bob.privateKey);

    // Create host with pool-specific RPC URL
    const protocol = getProtocolWithState({
      host: createMockHost({ mnemonic: undefined, rpcUrl: pool.rpcUrl }),
      initialState: latestState
    });

    const DEPOSIT_AMOUNT = 1000000000000000000n; // 1 ETH

    // 1. Check initial balance is 0
    const initialBalance = await protocol.balance([nativeAsset]);
    const unwrapped = unwrapBalance(initialBalance, nativeAsset);
    const { approved } = unwrapped;
    let { pending } = unwrapped;

    expect(approved?.amount).toBe(0n);
    expect(pending?.amount).toBe(0n);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const _i in Array(3).fill(null)) {
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
    const postDepositBalance = await protocol.balance([nativeAsset]);
    const DEPOSIT_AMOUNT_AFTER_EP_FEE = deductVettingFees(DEPOSIT_AMOUNT, vettingFees);

    ({ pending } = unwrapBalance(postDepositBalance, nativeAsset));
    expect(pending?.amount).toBe(3n * DEPOSIT_AMOUNT_AFTER_EP_FEE);

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

  });

});
