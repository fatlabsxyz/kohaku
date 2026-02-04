import { ethers } from '@kohaku-eth/provider/ethers';
import { Wallet } from 'ethers';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { E_ADDRESS } from '../../../src/config/constants';
import { MAINNET_CONFIG } from '../../../src/config/index';
import { PrivacyPoolsV1Protocol } from '../../../src/index';
import { Eip155ChainId, Erc20Id } from '@kohaku-eth/plugins';
import { defineAnvil, type AnvilInstance } from '../../utils/anvil';
import { getEnv } from '../../utils/common';
import { createMockHost } from '../../utils/mock-host';
import { TEST_ACCOUNTS } from '../../utils/test-accounts';
import { approveERC20, fundAccountWithETH, transferERC20FromWhale } from '../../utils/test-helpers';

describe('PrivacyPools v1 E2E Flow', () => {
  let anvil: AnvilInstance;

  const MAINNET_FORK_URL = getEnv('MAINNET_RPC_URL', 'https://no-fallback');
  const MAINNET_CHAIN_ID = new Eip155ChainId(1);
  const ENTRYPOINT_ADDRESS = BigInt(MAINNET_CONFIG.ENTRYPOINT_ADDRESS);

  beforeAll(async () => {
    anvil = defineAnvil({
      forkUrl: MAINNET_FORK_URL,
      port: 8545,
      chainId: 1,
    });

    await anvil.start();
  }, 300000);

  afterAll(async () => {
    await anvil.stop();
  });

  it.skip('[prepareShield] generates valid native ETH deposit transaction', async () => {
    const host = createMockHost();

    const protocol = new PrivacyPoolsV1Protocol(host, {
      chainsEntrypoints: {
        [MAINNET_CHAIN_ID.toString()]: ENTRYPOINT_ADDRESS
      }
    });

    // E_ADDRESS represents native ETH in Privacy Pools
    const nativeAsset = new Erc20Id(E_ADDRESS, MAINNET_CHAIN_ID);

    const { txns } = await protocol.prepareShield(
      { asset: nativeAsset, amount: 1000000000000000000n } // 1 ETH
    );

    expect(txns).toHaveLength(1);
    const tx = txns[0];

    expect(tx.to?.toLowerCase()).toBe(MAINNET_CONFIG.ENTRYPOINT_ADDRESS.toLowerCase());
    expect(tx.value).toBe(1000000000000000000n);
    expect(tx.data).toMatch(/^0x/);
  });

  it('[prepareShield] executes successful deposit on forked mainnet', async () => {
    const pool = anvil.pool(2);
    const jsonRpcProvider = await pool.getProvider();
    const provider = ethers(jsonRpcProvider);

    const alice = new Wallet(TEST_ACCOUNTS.alice.privateKey, jsonRpcProvider);

    await fundAccountWithETH(pool, alice.address, BigInt('10000000000000000000'));

    // Create host with pool-specific RPC URL
    const host = createMockHost(undefined, pool.rpcUrl);

    const protocol = new PrivacyPoolsV1Protocol(host, {
      chainsEntrypoints: {
        [MAINNET_CHAIN_ID.toString()]: ENTRYPOINT_ADDRESS
      }
    });

    // E_ADDRESS represents native ETH in Privacy Pools
    const nativeAsset = new Erc20Id(E_ADDRESS, MAINNET_CHAIN_ID);
    const DEPOSIT_AMOUNT = 1000000000000000000n; // 1 ETH

    // 1. Check initial balance is 0
    const initialBalances = await protocol.balance([nativeAsset]);

    expect(initialBalances[0].amount).toBe(0n);

    // 2. Prepare and execute deposit
    const { txns } = await protocol.prepareShield(
      { asset: nativeAsset, amount: DEPOSIT_AMOUNT }
    );

    const [tx] = txns;
    const txResponse = await alice.sendTransaction({
      to: tx.to,
      data: tx.data,
      value: tx.value,
      gasLimit: 6000000n,
    });

    await pool.mine(1);
    const receipt = await provider.getTransactionReceipt(txResponse.hash);

    expect(receipt).toBeTruthy();
    expect(receipt?.status).toBe(1); // Success

    // 3. Verify state after deposit
    console.log("BEFORE ENTERING, blk num", await (await pool.getProvider()).getBlockNumber());
    const postDepositBalances = await protocol.balance([nativeAsset]);

    // const r = protocol.stateManager.getBalances({
    //   assets: [BigInt(E_ADDRESS)],
    //   chainId: MAINNET_CHAIN_ID,
    //   entrypoint: ENTRYPOINT_ADDRESS
    // });


    expect(postDepositBalances[0].amount).toBe(DEPOSIT_AMOUNT);
  }, 60_000_000);

  it.skip('[prepareShield] generates valid ERC20 deposit transaction', async () => {
    const host = createMockHost();

    const protocol = new PrivacyPoolsV1Protocol(host, {
      chainsEntrypoints: {
        [MAINNET_CHAIN_ID.toString()]: ENTRYPOINT_ADDRESS
      }
    });

    const USDC_ADDRESS = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
    const usdcAsset = new Erc20Id(USDC_ADDRESS, MAINNET_CHAIN_ID);

    const { txns } = await protocol.prepareShield(
      { asset: usdcAsset, amount: 100000000n } // 100 USDC
    );

    expect(txns).toHaveLength(1);
    const [tx] = txns;

    expect(tx.to?.toLowerCase()).toBe(MAINNET_CONFIG.ENTRYPOINT_ADDRESS.toLowerCase());
    expect(tx.value).toBe(0n); // ERC20 has no ETH value
    expect(tx.data).toMatch(/^0x/);
  });

  it.skip('[prepareShield] executes successful ERC20 deposit on forked mainnet', async () => {
    const pool = anvil.pool(4);
    const jsonRpcProvider = await pool.getProvider();
    const provider = ethers(jsonRpcProvider);

    const alice = new Wallet(TEST_ACCOUNTS.alice.privateKey, jsonRpcProvider);

    await fundAccountWithETH(pool, alice.address, BigInt('10000000000000000000'));

    // Create host with pool-specific RPC URL
    const host = createMockHost(undefined, pool.rpcUrl);

    const protocol = new PrivacyPoolsV1Protocol(host, {
      chainsEntrypoints: {
        [MAINNET_CHAIN_ID.toString()]: ENTRYPOINT_ADDRESS
      }
    });

    const USDC_ADDRESS = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
    const USDC_WHALE = '0x55FE002aefF02f77364de339a1292923A15844B8'; // Circle Treasury
    const DEPOSIT_AMOUNT = 100000000n; // 100 USDC (6 decimals)

    const usdcAsset = new Erc20Id(USDC_ADDRESS, MAINNET_CHAIN_ID);

    // 1. Check initial balance is 0
    const initialBalances = await protocol.balance([usdcAsset]);

    expect(initialBalances[0].amount).toBe(0n);

    // 2. Setup: Transfer USDC from whale to Alice
    await transferERC20FromWhale(pool.rpcUrl, USDC_ADDRESS, USDC_WHALE, alice.address, DEPOSIT_AMOUNT);

    // 3. Approve entrypoint to spend USDC
    await approveERC20(alice, USDC_ADDRESS, MAINNET_CONFIG.ENTRYPOINT_ADDRESS, DEPOSIT_AMOUNT);

    // 4. Prepare and execute deposit
    const { txns } = await protocol.prepareShield(
      { asset: usdcAsset, amount: DEPOSIT_AMOUNT }
    );

    const [tx] = txns;
    const txResponse = await alice.sendTransaction({
      to: tx.to,
      data: tx.data,
      value: tx.value,
      gasLimit: 6000000n,
    });

    await pool.mine(1);
    const receipt = await provider.getTransactionReceipt(txResponse.hash);

    expect(receipt).toBeTruthy();
    expect(receipt?.status).toBe(1); // Success

    // 5. Verify state after deposit
    const postDepositBalances = await protocol.balance([usdcAsset]);

    expect(postDepositBalances[0].amount).toBe(DEPOSIT_AMOUNT);
  });

  it.skip('[prepareShield] accumulates multiple deposits correctly', async () => {
    const pool = anvil.pool(5);
    const jsonRpcProvider = await pool.getProvider();

    const alice = new Wallet(TEST_ACCOUNTS.alice.privateKey, jsonRpcProvider);

    // Fund with enough ETH for multiple deposits
    await fundAccountWithETH(pool, alice.address, BigInt('100000000000000000000')); // 100 ETH

    // Create host with pool-specific RPC URL
    const host = createMockHost(undefined, pool.rpcUrl);

    const protocol = new PrivacyPoolsV1Protocol(host, {
      chainsEntrypoints: {
        [MAINNET_CHAIN_ID.toString()]: ENTRYPOINT_ADDRESS
      }
    });

    const nativeAsset = new Erc20Id(E_ADDRESS, MAINNET_CHAIN_ID);
    const DEPOSIT_AMOUNT_1 = 1000000000000000000n; // 1 ETH
    const DEPOSIT_AMOUNT_2 = 2000000000000000000n; // 2 ETH

    // 1. First deposit
    const { txns: txns1 } = await protocol.prepareShield(
      { asset: nativeAsset, amount: DEPOSIT_AMOUNT_1 }
    );

    await alice.sendTransaction({
      to: txns1[0].to,
      data: txns1[0].data,
      value: txns1[0].value,
      gasLimit: 6000000n,
    });
    await pool.mine(1);

    // 2. Verify first deposit balance
    const balance1 = await protocol.balance([nativeAsset]);

    expect(balance1[0].amount).toBe(DEPOSIT_AMOUNT_1);

    // 3. Second deposit
    const { txns: txns2 } = await protocol.prepareShield(
      { asset: nativeAsset, amount: DEPOSIT_AMOUNT_2 }
    );

    await alice.sendTransaction({
      to: txns2[0].to,
      data: txns2[0].data,
      value: txns2[0].value,
      gasLimit: 6000000n,
    });
    await pool.mine(1);

    // 4. Verify cumulative balance
    const balance2 = await protocol.balance([nativeAsset]);

    expect(balance2[0].amount).toBe(DEPOSIT_AMOUNT_1 + DEPOSIT_AMOUNT_2);
  });
});
