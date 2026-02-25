import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ethers } from 'ethers';
import { Account as TongoAccount } from '@fatsolutions/tongo-evm';

import { defineAnvil, type AnvilInstance } from '../utils/anvil';
import { getEnv } from '../utils/common';
import { setupWallet, mintERC20 } from '../utils/test-helpers';
import { TongoPlugin } from '../../src/tongo';
import { Erc20Id, Eip155AccountId } from '@kohaku-eth/plugins';
import type { Host } from '@kohaku-eth/plugins';

const SEPOLIA_FORK_URL = getEnv('SEPOLIA_RPC_URL', 'https://no-fallback');

const USDC_ADDRESS =
  '0xaBaAC28219739838C2428edb931b4BbB7B14bAB7';

const TONGO_CONTRACT_ADDRESS =
  '0xDf978aD176352906a5dAC3D1c025Cf4CEE9B1124';

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
];

describe('tongo EVM Fund E2E', () => {
  let anvil: AnvilInstance;

  beforeAll(async () => {
    anvil = defineAnvil({
      forkUrl: SEPOLIA_FORK_URL,
      port: 8560,
      chainId: 11155111,
    });

    await anvil.start();
  }, 300000);

  afterAll(async () => {
    await anvil.stop();
  });

  it('[fund] executes successful ERC20 fund on forked Sepolia', async () => {
    const pool = anvil.pool(1);
    const provider = new ethers.JsonRpcProvider(pool.rpcUrl);
    const receiver = await setupWallet(pool, process.env.TEST_PRIVATE_KEY!);
    const ethProvider = {
      request: ({ method, params }: { method: string; params?: unknown[] | Record<string, unknown> }) =>
        provider.send(method, Array.isArray(params) ? params : []),
    };
    const host = { ethProvider } as unknown as Host;
    const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);

    const tongoAccount = new TongoAccount(1n, TONGO_CONTRACT_ADDRESS, ethProvider);
    const usdcAssetId = new Erc20Id(USDC_ADDRESS);
    const plugin = new TongoPlugin(host, {
      chain: 11155111,
      deploys: new Map([[usdcAssetId, TONGO_CONTRACT_ADDRESS]]),
    });
    const FUND_AMOUNT = 100_000_000n;

    const initialState = await tongoAccount.state();

    expect(initialState.balance).toBe(0n);

    const rate = await tongoAccount.rate();
    const initialTongoUsdc = await usdc.balanceOf(TONGO_CONTRACT_ADDRESS);

    await mintERC20(pool, USDC_ADDRESS, receiver.address, FUND_AMOUNT * rate);

    const initialUserUsdc = await usdc.balanceOf(receiver.address);

    const { txns } = await plugin.prepareShield(
      { asset: usdcAssetId, amount: FUND_AMOUNT },
      new Eip155AccountId(receiver.address as `0x${string}`)
    );
    const [approveTxData, fundTxData] = txns;

    const approveTx = await receiver.sendTransaction({
      to: approveTxData.to, data: approveTxData.data, value: approveTxData.value,
    });

    await approveTx.wait();

    const fundTx = await receiver.sendTransaction({
      to: fundTxData.to, data: fundTxData.data, value: fundTxData.value, gasLimit: 6_000_000n,
    });

    await pool.mine(1);

    const receipt = await provider.getTransactionReceipt(fundTx.hash);

    expect(receipt?.status).toBe(1);

    expect(await usdc.balanceOf(receiver.address)).toBe(initialUserUsdc - FUND_AMOUNT * rate);
    expect(await usdc.balanceOf(TONGO_CONTRACT_ADDRESS)).toBe(initialTongoUsdc + FUND_AMOUNT * rate);

    const postState = await tongoAccount.state();

    expect(postState.balance).toBe(FUND_AMOUNT);

    const fundEvent = receipt!.logs.find(
      (log) => log.address.toLowerCase() === TONGO_CONTRACT_ADDRESS.toLowerCase()
    );

    expect(fundEvent).toBeTruthy();
  });


  it('[fund] accumulates multiple deposits correctly', async () => {
    const pool = anvil.pool(2);
    const provider = new ethers.JsonRpcProvider(pool.rpcUrl);
    const receiver = await setupWallet(pool, process.env.TEST_PRIVATE_KEY!);
    const ethProvider = {
      request: ({ method, params }: { method: string; params?: unknown[] | Record<string, unknown> }) =>
        provider.send(method, Array.isArray(params) ? params : []),
    };
    const host = { ethProvider } as unknown as Host;

    const tongoAccount = new TongoAccount(1n, TONGO_CONTRACT_ADDRESS, ethProvider);
    const usdcAssetId = new Erc20Id(USDC_ADDRESS);
    const plugin = new TongoPlugin(host, {
      chain: 11155111,
      deploys: new Map([[usdcAssetId, TONGO_CONTRACT_ADDRESS]]),
    });

    const A = 100_000_000n;
    const B = 200_000_000n;

    const rate = await tongoAccount.rate();
    
    await mintERC20(pool, USDC_ADDRESS, receiver.address, (A + B) * rate);

    // --- Deposit A ---
    const { txns: txnsA } = await plugin.prepareShield(
      { asset: usdcAssetId, amount: A },
      new Eip155AccountId(receiver.address as `0x${string}`)
    );

    await receiver.sendTransaction({ to: txnsA[0].to, data: txnsA[0].data, value: txnsA[0].value });
    await pool.mine(1);
    await receiver.sendTransaction({ to: txnsA[1].to, data: txnsA[1].data, value: txnsA[1].value, gasLimit: 6_000_000n });
    await pool.mine(1);

    // --- Deposit B ---
    const { txns: txnsB } = await plugin.prepareShield(
      { asset: usdcAssetId, amount: B },
      new Eip155AccountId(receiver.address as `0x${string}`)
    );

    await receiver.sendTransaction({ to: txnsB[0].to, data: txnsB[0].data, value: txnsB[0].value });
    await pool.mine(1);
    await receiver.sendTransaction({ to: txnsB[1].to, data: txnsB[1].data, value: txnsB[1].value, gasLimit: 6_000_000n });
    await pool.mine(1);

    const finalState = await tongoAccount.state();
    
    expect(finalState.balance).toBe(A + B);
  });
});
