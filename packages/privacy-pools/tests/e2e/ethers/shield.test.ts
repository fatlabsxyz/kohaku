import { ethers } from '@kohaku-eth/provider/ethers';
import { SigningKey, Wallet } from 'ethers';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { E_ADDRESS } from '../../../src/config/constants';
import { MAINNET_CONFIG } from '../../../src/config/index';
import { PrivacyPoolsV1Protocol } from '../../../src/index';
import { Eip155ChainId, Erc20Id } from '@kohaku-eth/plugins';
import { AnvilPool, defineAnvil, type AnvilInstance } from '../../utils/anvil';
import { getEnv } from '../../utils/common';
import { createMockHost } from '../../utils/mock-host';
import { TEST_ACCOUNTS } from '../../utils/test-accounts';
import { approveERC20, assetVettingFee, fundAccountWithETH, transferERC20FromWhale } from '../../utils/test-helpers';

describe('PrivacyPools v1 E2E Flow', () => {
  let anvil: AnvilInstance;

  const MAINNET_FORK_URL = getEnv('MAINNET_RPC_URL', 'https://no-fallback');
  const MAINNET_CHAIN_ID = new Eip155ChainId(1);
  const ENTRYPOINT_ADDRESS = BigInt(MAINNET_CONFIG.ENTRYPOINT_ADDRESS);

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

  it('[prepareShield] generates valid native ETH deposit transaction', async () => {
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
    const initialBalancesApproved = await protocol.balance([nativeAsset], 'unapproved');
    expect(initialBalancesApproved[0].amount).toBe(0n);
    const initialBalancesUnapproved = await protocol.balance([nativeAsset], "unapproved");
    expect(initialBalancesUnapproved[0].amount).toBe(0n);

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
    const postDepositBalances = await protocol.balance([nativeAsset], 'unapproved');

    const vettingFees = await assetVettingFee(alice, ENTRYPOINT_ADDRESS, nativeAsset);
    const DEPOSIT_AMOUNT_AFTER_EP_FEE = deductVettingFees(DEPOSIT_AMOUNT, vettingFees);

    expect(postDepositBalances[0].amount).toBe(DEPOSIT_AMOUNT_AFTER_EP_FEE);
  }, 60_000_000);

  it('[prepareShield] generates valid ERC20 deposit transaction', async () => {
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

  it('[prepareShield] executes successful ERC20 deposit on forked mainnet', async () => {
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
    const initialBalancesApproved = await protocol.balance([usdcAsset]);
    expect(initialBalancesApproved[0].amount).toBe(0n);
    const initialBalancesUnapproved = await protocol.balance([usdcAsset], "unapproved");
    expect(initialBalancesUnapproved[0].amount).toBe(0n);

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
    const postDepositBalances = await protocol.balance([usdcAsset], "unapproved");

    const vettingFees = await assetVettingFee(alice, ENTRYPOINT_ADDRESS, usdcAsset);
    const DEPOSIT_AMOUNT_AFTER_EP_FEE = deductVettingFees(DEPOSIT_AMOUNT, vettingFees);

    expect(postDepositBalances[0].amount).toBe(DEPOSIT_AMOUNT_AFTER_EP_FEE);
  });

  it('[prepareShield] accumulates multiple deposits correctly', async () => {
    const pool = anvil.pool(5);

    // Fund with enough ETH for multiple deposits
    const alice = await setupWallet(pool, TEST_ACCOUNTS.alice.privateKey);

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

    const vettingFees = await assetVettingFee(alice, ENTRYPOINT_ADDRESS, nativeAsset);
    const POST_FEE_DEPOSIT_AMOUNT_1 = deductVettingFees(DEPOSIT_AMOUNT_1, vettingFees);
    const POST_FEE_DEPOSIT_AMOUNT_2 = deductVettingFees(DEPOSIT_AMOUNT_2, vettingFees);

    // 1. First deposit
    const { txns: [tx] } = await protocol.prepareShield(
      { asset: nativeAsset, amount: DEPOSIT_AMOUNT_1 }
    );
    await sendTx(alice, tx);
    await pool.mine(1);

    // 2. Verify first deposit balance
    const [approvedBalance1] = await protocol.balance([nativeAsset], "approved");
    expect(approvedBalance1.amount).toBe(0n);
    const [balance1] = await protocol.balance([nativeAsset], "unapproved");
    expect(balance1.amount).toBe(POST_FEE_DEPOSIT_AMOUNT_1);

    // 3. Second deposit
    const { txns: [tx2] } = await protocol.prepareShield(
      { asset: nativeAsset, amount: DEPOSIT_AMOUNT_2 }
    );
    await sendTx(alice, tx2);
    await pool.mine(1);

    // 4. Verify cumulative balance
    const [approvedBalance2] = await protocol.balance([nativeAsset], "approved");
    expect(approvedBalance2.amount).toBe(0n);
    const [balance2] = await protocol.balance([nativeAsset], "unapproved");
    expect(balance2.amount).toBe(POST_FEE_DEPOSIT_AMOUNT_1 + POST_FEE_DEPOSIT_AMOUNT_2);
  });
});


function deductVettingFees(amount: bigint, vettingFeeBPS: bigint) {
  const vettingFees = amount * vettingFeeBPS / 10_000n;
  return amount - vettingFees;
}

async function sendTx(signer: Wallet, { to, data, value }: { to: string; data: string; value: bigint; }) {
  return signer.sendTransaction({ to, data, value, gasLimit: 6000000n });
}

async function setupWallet(pool: AnvilPool, pk: string | SigningKey): Promise<Wallet> {
  const jsonRpcProvider = await pool.getProvider();
  const signer = new Wallet(pk, jsonRpcProvider);
  // Fund with enough ETH for multiple deposits
  await fundAccountWithETH(pool, signer.address, BigInt('100000000000000000000')); // 100 ETH
  return signer;
}
