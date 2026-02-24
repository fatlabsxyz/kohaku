import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ethers } from 'ethers';

import { defineAnvil, type AnvilInstance } from '../utils/anvil';
import { getEnv } from '../utils/common';
import { setupWallet, transferERC20FromWhale, approveERC20 } from '../utils/test-helpers';

const MAINNET_FORK_URL = getEnv('MAINNET_RPC_URL', 'https://no-fallback');

const USDC_ADDRESS =
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';

const USDC_WHALE =
  '0x55FE002aefF02f77364de339a1292923A15844B8';

const TONGO_CONTRACT_ADDRESS =
  '0x5125c5f61dbf50619e1169b998783d3ba64cc2d558d57e5e12e23407b2460b2c';

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
];

const TONGO_ABI = [
  'function fund(address token, uint256 amount)',
  'function balanceOf(address user, address token) view returns (uint256)',
  'event Fund(address indexed user, address indexed token, uint256 amount)',
];

describe('tongo EVM Fund E2E', () => {
  let anvil: AnvilInstance;

  beforeAll(async () => {
    anvil = defineAnvil({
      forkUrl: MAINNET_FORK_URL,
      port: 8560,
      chainId: 1,
    });

    await anvil.start();
  }, 300000);

  afterAll(async () => {
    await anvil.stop();
  });

  it('[fund] executes successful ERC20 fund on forked mainnet', async () => {
    const pool = anvil.pool(1);
    const provider = new ethers.JsonRpcProvider(pool.rpcUrl);

    const receiver = await setupWallet(pool, process.env.TEST_PRIVATE_KEY!);

    const usdc = new ethers.Contract(
      USDC_ADDRESS,
      ERC20_ABI,
      provider
    );

    const tongo = new ethers.Contract(
      TONGO_CONTRACT_ADDRESS,
      TONGO_ABI,
      provider
    );

    const FUND_AMOUNT = 100_000_000n;

    const initialUserUsdc = await usdc.balanceOf(receiver.address);
    const initialtongoUsdc = await usdc.balanceOf(TONGO_CONTRACT_ADDRESS);
    const initialInternalBalance = await tongo.balanceOf(
      receiver.address,
      USDC_ADDRESS
    );

    expect(initialInternalBalance).toBe(0n);

    await transferERC20FromWhale(
      pool.rpcUrl,
      USDC_ADDRESS,
      USDC_WHALE,
      receiver.address,
      FUND_AMOUNT
    );

    await approveERC20(
      receiver,
      USDC_ADDRESS,
      TONGO_CONTRACT_ADDRESS,
      FUND_AMOUNT
    );

    const tx = await tongo
      .connect(receiver)
      .fund(USDC_ADDRESS, FUND_AMOUNT, {
        gasLimit: 6_000_000n,
      });

    await pool.mine(1);

    const receipt = await provider.getTransactionReceipt(tx.hash);

    expect(receipt?.status).toBe(1);

    const postUserUsdc = await usdc.balanceOf(receiver.address);
    const posttongoUsdc = await usdc.balanceOf(TONGO_CONTRACT_ADDRESS);
    const postInternalBalance = await tongo.balanceOf(
      receiver.address,
      USDC_ADDRESS
    );

    expect(postUserUsdc).toBe(initialUserUsdc + 0n);
    expect(postUserUsdc).toBe(
      initialUserUsdc + FUND_AMOUNT - FUND_AMOUNT
    );

    expect(posttongoUsdc).toBe(
      initialtongoUsdc + FUND_AMOUNT
    );

    expect(postInternalBalance).toBe(FUND_AMOUNT);

    const fundEvent = receipt!.logs.find(
      (log) =>
        log.address.toLowerCase() ===
        TONGO_CONTRACT_ADDRESS.toLowerCase()
    );

    expect(fundEvent).toBeTruthy();
  });

  it('[fund] accumulates multiple deposits correctly', async () => {
    const pool = anvil.pool(2);
    const provider = new ethers.JsonRpcProvider(pool.rpcUrl);

    const receiver = await setupWallet(pool, process.env.TEST_PRIVATE_KEY!);

    const usdc = new ethers.Contract(
      USDC_ADDRESS,
      ERC20_ABI,
      provider
    );

    const tongo = new ethers.Contract(
      TONGO_CONTRACT_ADDRESS,
      TONGO_ABI,
      provider
    );

    const A = 100_000_000n;
    const B = 200_000_000n;

    await transferERC20FromWhale(
      pool.rpcUrl,
      USDC_ADDRESS,
      USDC_WHALE,
      receiver.address,
      A + B
    );

    await approveERC20(
      receiver,
      USDC_ADDRESS,
      TONGO_CONTRACT_ADDRESS,
      A + B
    );

    await tongo
      .connect(receiver)
      .fund(USDC_ADDRESS, A, {
        gasLimit: 6_000_000n,
      });

    await pool.mine(1);

    await tongo
      .connect(receiver)
      .fund(USDC_ADDRESS, B, {
        gasLimit: 6_000_000n,
      });

    await pool.mine(1);

    const finalBalance = await tongo.balanceOf(
      receiver.address,
      USDC_ADDRESS
    );

    expect(finalBalance).toBe(A + B);
  });
});