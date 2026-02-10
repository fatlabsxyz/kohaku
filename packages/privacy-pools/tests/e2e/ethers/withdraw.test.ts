import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AccountId, Eip155ChainId, Erc20Id } from '@kohaku-eth/plugins';

import { E_ADDRESS } from '../../../src/config/constants';
import { MAINNET_CONFIG } from '../../../src/config/index';
import { PrivacyPoolsV1Protocol } from '../../../src/index';
import { defineAnvil, type AnvilInstance } from '../../utils/anvil';
import { getEnv } from '../../utils/common';
import { createMockAspService } from '../../utils/mock-asp-service';
import { createMockHost } from '../../utils/mock-host';
import { mockProverFactory } from '../../utils/mock-prover';
import { createMockRelayerClient } from '../../utils/mock-relayer';
import { TEST_ACCOUNTS } from '../../utils/test-accounts';
import { assetVettingFee, deductVettingFees, pushNewAspRoot, sendTx, setupWallet } from '../../utils/test-helpers';

const POSTMAN_ADDRESS_HEX = "0x1f4Fe25Cf802a0605229e0Dc497aAf653E86E187";

describe('PrivacyPools v1 Unshield E2E', () => {
  let anvil: AnvilInstance;

  const MAINNET_FORK_URL = getEnv('MAINNET_RPC_URL', 'https://no-fallback');
  const MAINNET_CHAIN_ID = new Eip155ChainId(1);
  const ENTRYPOINT_ADDRESS = BigInt(MAINNET_CONFIG.ENTRYPOINT_ADDRESS);
  const POSTMAN_ADDRESS = BigInt(POSTMAN_ADDRESS_HEX);

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

  it('[prepareUnshield] prepares withdrawal after deposit', async () => {
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
        [MAINNET_CHAIN_ID.toString()]: ENTRYPOINT_ADDRESS
      },
      proverFactory: mockProverFactory,
      relayersList: { 'mock-relayer': 'http://mock.relayer' },
      relayerClientFactory: () => mockRelayerClient,
      aspServiceFactory: () => mockAspService,
    });

    const nativeAsset = new Erc20Id(E_ADDRESS, MAINNET_CHAIN_ID);
    const DEPOSIT_AMOUNT = 1000000000000000000n; // 1 ETH
    const WITHDRAW_AMOUNT = 500000000000000000n; // 0.5 ETH

    // 1. Deposit first
    const { txns: [shieldTx] } = await protocol.prepareShield(
      { asset: nativeAsset, amount: DEPOSIT_AMOUNT }
    );

    await sendTx(alice, shieldTx);
    await pool.mine(1);

    // 2. Verify deposit balance
    const [balanceAfterDeposit] = await protocol.balance([nativeAsset], "unapproved");
    expect(balanceAfterDeposit.amount).toBe(deductVettingFees(DEPOSIT_AMOUNT, vettingFees));

    // 2.b Approve deposits
    const [note, ..._] = await protocol.notes([nativeAsset]);
    mockAspService.addLabel(note.label);
    console.log("label", note.label);
    await pushNewAspRoot(pool.rpcUrl,
      "0x" + ENTRYPOINT_ADDRESS.toString(16),
      "0x" + POSTMAN_ADDRESS.toString(16),
      { _root: mockAspService.getRoot(), _ipfsCID: "iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii" }
    );

    const [balanceAfterDepositApproved] = await protocol.balance([nativeAsset], "approved");
    expect(balanceAfterDepositApproved.amount).toBe(deductVettingFees(DEPOSIT_AMOUNT, vettingFees));

    // 3. Prepare withdrawal
    const recipientAccount = { address: alice.address } as unknown as AccountId;
    const withdrawOp = await protocol.prepareUnshield(
      { asset: nativeAsset, amount: WITHDRAW_AMOUNT },
      recipientAccount
    );

    // 4. Verify withdrawal operation structure
    expect(withdrawOp.relayData).toBeDefined();
    expect(withdrawOp.relayData.quote).toBeDefined();
    expect(withdrawOp.relayData.quote.feeBPS).toBe('100');
    expect(withdrawOp.relayData.relayerId).toBe('mock-relayer');
    expect(withdrawOp.rawData).toBeDefined();
    expect(withdrawOp.rawData.proof).toBeDefined();
    expect(withdrawOp.txData).toBeDefined();
  }, 120000);

  it('[prepareUnshield] selects lowest fee relayer', async () => {
    const pool = anvil.pool(11);
    const alice = await setupWallet(pool, TEST_ACCOUNTS.alice.privateKey);

    // Create mock asp
    const mockAspService = createMockAspService();
    mockAspService.addLabels([0n, 1n, 2n]);

    // Create two mock relayers with different fees
    const expensiveRelayer = createMockRelayerClient({ feeBPS: '500' });
    const cheapRelayer = createMockRelayerClient({ feeBPS: '50' });

    // We need a custom relayer client that routes based on URL
    const multiRelayerClient = {
      async getQuote(body: Parameters<typeof expensiveRelayer.getQuote>[0]) {
        if (body.relayerUrl.includes('expensive')) {
          return expensiveRelayer.getQuote(body);
        }
        return cheapRelayer.getQuote(body);
      },
      relay: cheapRelayer.relay,
      getFees: cheapRelayer.getFees,
    };

    const host = createMockHost(undefined, pool.rpcUrl);
    const protocol = new PrivacyPoolsV1Protocol(host, {
      chainsEntrypoints: {
        [MAINNET_CHAIN_ID.toString()]: ENTRYPOINT_ADDRESS
      },
      relayersList: {
        'expensive-relayer': 'http://expensive.relayer',
        'cheap-relayer': 'http://cheap.relayer',
      },
      proverFactory: mockProverFactory,
      aspServiceFactory: () => mockAspService,
      relayerClientFactory: () => multiRelayerClient,
    });

    const nativeAsset = new Erc20Id(E_ADDRESS, MAINNET_CHAIN_ID);
    const DEPOSIT_AMOUNT = 1000000000000000000n;
    const WITHDRAW_AMOUNT = 500000000000000000n;

    // 1. Deposit
    const { txns: [shieldTx] } = await protocol.prepareShield(
      { asset: nativeAsset, amount: DEPOSIT_AMOUNT }
    );

    await sendTx(alice, shieldTx);
    await pool.mine(1);

    // 2. Approve deposits
    const [note, ..._] = await protocol.notes([nativeAsset]);
    mockAspService.addLabel(note.label);
    console.log("label", note.label);
    await pushNewAspRoot(pool.rpcUrl,
      "0x" + ENTRYPOINT_ADDRESS.toString(16),
      "0x" + POSTMAN_ADDRESS.toString(16),
      { _root: mockAspService.getRoot(), _ipfsCID: "iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii" }
    );

    const [balanceAfterDepositApproved] = await protocol.balance([nativeAsset], "approved");
    expect(balanceAfterDepositApproved.amount).toBe(deductVettingFees(DEPOSIT_AMOUNT, vettingFees));

    // 3. Prepare withdrawal - should select cheap relayer
    const recipientAccount = { address: alice.address } as unknown as AccountId;
    const withdrawOp = await protocol.prepareUnshield(
      { asset: nativeAsset, amount: WITHDRAW_AMOUNT },
      recipientAccount
    );

    // 4. Verify cheapest relayer was selected
    expect(withdrawOp.relayData.quote.feeBPS).toBe('50');
    expect(withdrawOp.relayData.relayerId).toBe('cheap-relayer');
  }, 120000);

  it('[prepareUnshield] throws when no sufficient balance', async () => {
    const pool = anvil.pool(12);
    const alice = await setupWallet(pool, TEST_ACCOUNTS.alice.privateKey);

    // Create mock asp
    const mockAspService = createMockAspService();
    mockAspService.addLabels([0n, 1n, 2n]);

    const mockRelayerClient = createMockRelayerClient();

    const host = createMockHost(undefined, pool.rpcUrl);
    const protocol = new PrivacyPoolsV1Protocol(host, {
      chainsEntrypoints: {
        [MAINNET_CHAIN_ID.toString()]: ENTRYPOINT_ADDRESS
      },
      relayersList: { 'mock-relayer': 'http://mock.relayer' },
      relayerClientFactory: () => mockRelayerClient,
      proverFactory: mockProverFactory,
      aspServiceFactory: () => mockAspService,
    });

    const nativeAsset = new Erc20Id(E_ADDRESS, MAINNET_CHAIN_ID);
    const WITHDRAW_AMOUNT = 1000000000000000000n; // 1 ETH (no deposit made)

    // Try to withdraw without depositing first
    const recipientAccount = { address: alice.address } as unknown as AccountId;

    await expect(
      protocol.prepareUnshield(
        { asset: nativeAsset, amount: WITHDRAW_AMOUNT },
        recipientAccount
      )
    ).rejects.toThrow('No note with sufficient balance');
  }, 60000);

  it('[prepareUnshield] throws when all relayers fail', async () => {
    const pool = anvil.pool(13);
    const alice = await setupWallet(pool, TEST_ACCOUNTS.alice.privateKey);

    // Create a failing relayer
    const failingRelayer = createMockRelayerClient({ shouldFail: true });

    const host = createMockHost(undefined, pool.rpcUrl);
    const protocol = new PrivacyPoolsV1Protocol(host, {
      chainsEntrypoints: {
        [MAINNET_CHAIN_ID.toString()]: ENTRYPOINT_ADDRESS
      },
      relayersList: { 'failing-relayer': 'http://failing.relayer' },
      relayerClientFactory: () => failingRelayer,
    });

    const nativeAsset = new Erc20Id(E_ADDRESS, MAINNET_CHAIN_ID);
    const DEPOSIT_AMOUNT = 1000000000000000000n;
    const WITHDRAW_AMOUNT = 500000000000000000n;

    // 1. Deposit first
    const { txns } = await protocol.prepareShield(
      { asset: nativeAsset, amount: DEPOSIT_AMOUNT }
    );

    await alice.sendTransaction({
      to: txns[0].to,
      data: txns[0].data,
      value: txns[0].value,
      gasLimit: 6000000n,
    });
    await pool.mine(1);

    // 2. Try to withdraw - relayer should fail
    const recipientAccount = { address: alice.address } as unknown as AccountId;

    await expect(
      protocol.prepareUnshield(
        { asset: nativeAsset, amount: WITHDRAW_AMOUNT },
        recipientAccount
      )
    ).rejects.toThrow('Failed to get quote from relayers');
  }, 120000);
});
