import { Contract, getAddress, JsonRpcProvider, SigningKey, Wallet } from 'ethers';

import { type AnvilPool } from './anvil';

async function fundAccountWithETH(pool: AnvilPool, address: string, balance: bigint): Promise<void> {
  await pool.setBalance(address, `0x${balance.toString(16)}`);
}

export async function setupWallet(pool: AnvilPool, pk: string | SigningKey): Promise<Wallet> {
  const provider = await pool.getProvider();
  const signer = new Wallet(pk, provider);

  await fundAccountWithETH(pool, signer.address, 100000000000000000000n); // 100 ETH

  return signer;
}

export async function transferERC20FromWhale(
  rpcUrl: string,
  tokenAddress: string,
  whaleAddress: string,
  recipient: string,
  amount: bigint
): Promise<void> {
  const provider = new JsonRpcProvider(rpcUrl, undefined, { staticNetwork: true });
  const normalizedWhale = getAddress(whaleAddress.toLowerCase());

  await provider.send('anvil_impersonateAccount', [normalizedWhale]);
  await provider.send('anvil_setBalance', [normalizedWhale, '0x56BC75E2D63100000']); // 100 ETH

  const erc20Abi = ['function transfer(address to, uint256 amount) returns (bool)'];
  const impersonatedSigner = await provider.getSigner(normalizedWhale);
  const token = new Contract(tokenAddress, erc20Abi, impersonatedSigner);

  await (await token.transfer(recipient, amount)).wait();

  await provider.send('anvil_stopImpersonatingAccount', [normalizedWhale]);
}

export async function approveERC20(
  signer: Wallet,
  tokenAddress: string,
  spender: string,
  amount: bigint
): Promise<void> {
  const erc20Abi = ['function approve(address spender, uint256 amount) returns (bool)'];
  const token = new Contract(tokenAddress, erc20Abi, signer);

  await (await token.approve(spender, amount)).wait();
}
