import { ethers } from '@kohaku-eth/provider/ethers';
import { Wallet } from 'ethers';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { E_ADDRESS } from '../../src/config/constants';
import { MAINNET_CONFIG } from '../../src/config/index';
import { PrivacyPoolsV1Protocol } from '../../src/index';
import { AssetId, ChainId } from '@kohaku-eth/plugins';
import { defineAnvil, type AnvilInstance } from '../utils/anvil';
import { getEnv } from '../utils/common';
import { createMockHost } from '../utils/mock-host';
import { TEST_ACCOUNTS } from '../utils/test-accounts';
import { approveERC20, fundAccountWithETH, transferERC20FromWhale } from '../utils/test-helpers';

describe('PrivacyPools v1 E2E Flow', () => {
  let anvil: AnvilInstance;

  const MAINNET_FORK_URL = getEnv('MAINNET_RPC_URL', 'https://no-fallback');
  const MAINNET_CHAIN_ID: ChainId = { kind: 'Evm', chainId: 1 };

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

  it('[prepareShield] generates valid native ETH deposit transaction', async () => {
    const pool = anvil.pool(1);
    const host = createMockHost();

    const protocol = new PrivacyPoolsV1Protocol(host, {
      context: {
        entrypointAddress: (_chainId: ChainId) => MAINNET_CONFIG.ENTRYPOINT_ADDRESS
      }
    });

    const nativeAsset: AssetId = {
      chainId: MAINNET_CHAIN_ID,
      assetType: { kind: 'Erc20', address: E_ADDRESS }
    };

    const { txns } = await protocol.prepareShield(
      { asset: nativeAsset, amount: 1000000000000000000n } // 1 ETH
    );

    expect(txns).toHaveLength(1);
    const tx = txns[0];

    expect(tx.to).toBe(MAINNET_CONFIG.ENTRYPOINT_ADDRESS);
    expect(tx.value).toBe(1000000000000000000n);
    expect(tx.data).toMatch(/^0x/);
  });

  it('[prepareShield] executes successful deposit on forked mainnet', async () => {
    const pool = anvil.pool(2);
    const jsonRpcProvider = await pool.getProvider();
    const provider = ethers(jsonRpcProvider);

    const alice = new Wallet(TEST_ACCOUNTS.alice.privateKey, jsonRpcProvider);

    await fundAccountWithETH(pool, alice.address, BigInt('10000000000000000000'));

    const host = createMockHost();

    const protocol = new PrivacyPoolsV1Protocol(host, {
      context: {
        entrypointAddress: (_chainId: ChainId) => MAINNET_CONFIG.ENTRYPOINT_ADDRESS
      }
    });

    const nativeAsset: AssetId = {
      chainId: MAINNET_CHAIN_ID,
      assetType: { kind: 'Erc20', address: E_ADDRESS }
    };

    const { txns } = await protocol.prepareShield(
      { asset: nativeAsset, amount: 1000000000000000000n } // 1 ETH
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
  });

  it('[prepareShield] generates valid ERC20 deposit transaction', async () => {
    const pool = anvil.pool(3);
    const host = createMockHost();

    const protocol = new PrivacyPoolsV1Protocol(host, {
      context: {
        entrypointAddress: (_chainId: ChainId) => MAINNET_CONFIG.ENTRYPOINT_ADDRESS
      }
    });

    const USDC_ADDRESS = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
    const usdcAsset: AssetId = {
      chainId: MAINNET_CHAIN_ID,
      assetType: { kind: 'Erc20', address: USDC_ADDRESS }
    };

    const { txns } = await protocol.prepareShield(
      { asset: usdcAsset, amount: 100000000n } // 100 USDC
    );

    expect(txns).toHaveLength(1);
    const [tx] = txns;

    expect(tx.to).toBe(MAINNET_CONFIG.ENTRYPOINT_ADDRESS);
    expect(tx.value).toBe(0n); // ERC20 has no ETH value
    expect(tx.data).toMatch(/^0x/);
  });

  it('[prepareShield] executes successful ERC20 deposit on forked mainnet', async () => {
    const pool = anvil.pool(4);
    const jsonRpcProvider = await pool.getProvider();
    const provider = ethers(jsonRpcProvider);

    const alice = new Wallet(TEST_ACCOUNTS.alice.privateKey, jsonRpcProvider);

    await fundAccountWithETH(pool, alice.address, BigInt('10000000000000000000'));

    const host = createMockHost();

    const protocol = new PrivacyPoolsV1Protocol(host, {
      context: {
        entrypointAddress: (_chainId: ChainId) => MAINNET_CONFIG.ENTRYPOINT_ADDRESS
      }
    });

    const USDC_ADDRESS = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
    const USDC_WHALE = '0x55FE002aefF02f77364de339a1292923A15844B8'; // Circle Treasury
    const DEPOSIT_AMOUNT = 100000000n; // 100 USDC (6 decimals)

    // Transfer USDC from whale to Alice
    await transferERC20FromWhale(pool.rpcUrl, USDC_ADDRESS, USDC_WHALE, alice.address, DEPOSIT_AMOUNT);

    // Approve entrypoint to spend USDC
    await approveERC20(alice, USDC_ADDRESS, MAINNET_CONFIG.ENTRYPOINT_ADDRESS, DEPOSIT_AMOUNT);

    const usdcAsset: AssetId = {
      chainId: MAINNET_CHAIN_ID,
      assetType: { kind: 'Erc20', address: USDC_ADDRESS }
    };

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
  });
});
