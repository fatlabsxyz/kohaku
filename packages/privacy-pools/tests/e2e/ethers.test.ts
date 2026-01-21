import { ethers, EthersSignerAdapter } from '@kohaku-eth/provider/ethers';
import { Contract, Wallet } from 'ethers';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { defineAnvil, type AnvilInstance } from '../utils/anvil';
import { TEST_ACCOUNTS } from '../utils/test-accounts';
import { getEnv } from "../utils/common";
import { MAINNET_CONFIG } from '../../src/config/index.ts';
import { createPrivacyPoolsAccount } from '../../src/index.ts';

import { fundAccountWithETH, getETHBalance } from '../utils/test-helpers';
// import { loadOrCreateCache } from '../utils/cache';
import { formatEther } from 'viem';
import { EthereumProvider } from '@kohaku-eth/provider';
import { E_ADDRESS } from '../../src/config/constants.ts';


describe('PrivacyPools v1 E2E Flow', () => {

  let anvil: AnvilInstance;
  let provider: EthereumProvider;
  let alice: Wallet;
  let bob: Wallet;
  let charlie: Wallet;
  // let cachedLogs: TxLog[];
  // let cachedMerkleTrees: { tree: string[][]; nullifiers: string[] }[];
  let forkBlock: number;

  const MAINNET_FORK_URL = getEnv('MAINNET_RPC_URL', 'https://no-fallback');

  beforeAll(async () => {
    // forkBlock = 9327854; // More recent block

    // Setup anvil forking Sepolia
    anvil = defineAnvil({
      forkUrl: MAINNET_FORK_URL,
      port: 8545,
      chainId: 1,
      // forkBlockNumber: forkBlock,
    });

    await anvil.start();

    const jsonRpcProvider = await anvil.getProvider();

    provider = ethers(jsonRpcProvider);

    // Load or create cache for this fork block (this is the slow part on first run)
    // console.log(`\nLoading cache for fork block ${forkBlock}...`);
    // const cache = await loadOrCreateCache(provider, chainId, forkBlock);

    // cachedLogs = cache.logs;
    // cachedMerkleTrees = cache.merkleTrees;
    // console.log(`Cache loaded: ${cachedLogs.length} logs, ${cachedMerkleTrees.length} trees\n`);

    // Setup test accounts
    alice = new Wallet(TEST_ACCOUNTS.alice.privateKey, await anvil.getProvider());
    bob = new Wallet(TEST_ACCOUNTS.bob.privateKey, await anvil.getProvider());
    charlie = new Wallet(TEST_ACCOUNTS.charlie.privateKey, await anvil.getProvider());

    // // Fund alice with ETH
    await fundAccountWithETH(anvil, alice.address, BigInt('10000000000000000000')); // 10 ETH
    console.log(`Funded ${alice.address} with 10 ETH`);

  }, 300000); // 5 minute timeout for cache creation on first run

  it("[shield] executes a successfull PPv1 deposit", async () => {

    const account = createPrivacyPoolsAccount({
      credential: {
        type: 'mnemonic',
        mnemonic: 'test test test test test test test test test test test junk',
        accountIndex: 0
      },
      network: MAINNET_CONFIG
    });

    const { commitment, tx: shieldTx } = account.shield(E_ADDRESS, 1n);
    console.log("commitment", commitment)

    const shieldTxHash = await alice.sendTransaction({
      ...shieldTx,
      gasLimit: BigInt(6000000),
    });
    anvil.mine(1);

    const receipt = await provider.getTransactionReceipt(shieldTxHash.hash);

    expect(receipt).toBeTruthy();

  });

});
