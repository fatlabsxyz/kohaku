import { JsonRpcProvider, Contract, keccak256, AbiCoder, toBeHex, getAddress } from 'ethers';
import { type AnvilPool } from './anvil';

/**
 * Fund an account with ETH using anvil pool's setBalance
 */
export async function fundAccountWithETH(
  pool: AnvilPool,
  address: string,
  balance: bigint
): Promise<void> {
  await pool.setBalance(address, `0x${balance.toString(16)}`);
}

/**
 * Get ETH balance of an address
 */
export async function getETHBalance(
  provider: any,
  address: string
): Promise<bigint> {
  return await provider.getBalance(address);
}

/**
 * Calculate storage slot for a mapping(address => uint256)
 * slot = keccak256(abi.encode(key, baseSlot))
 */
function getMappingStorageSlot(address: string, baseSlot: number): string {
  const abiCoder = new AbiCoder();
  const encoded = abiCoder.encode(['address', 'uint256'], [address, baseSlot]);

  return keccak256(encoded);
}

/**
 * Fund an account with ERC20 tokens using anvil's setStorageAt
 * Works by directly manipulating the token's balance mapping in storage
 */
export async function fundAccountWithERC20(
  rpcUrl: string,
  tokenAddress: string,
  recipient: string,
  amount: bigint,
  balanceSlot: number = 9 // USDC uses slot 9 for balances
): Promise<void> {
  const provider = new JsonRpcProvider(rpcUrl, undefined, { staticNetwork: true });

  // Calculate the storage slot for the recipient's balance
  const slot = getMappingStorageSlot(recipient, balanceSlot);

  // Encode the amount as a 32-byte hex value
  const value = toBeHex(amount, 32);

  await provider.send('anvil_setStorageAt', [tokenAddress, slot, value]);
}

/**
 * Approve ERC20 spending
 */
export async function approveERC20(
  signer: any,
  tokenAddress: string,
  spender: string,
  amount: bigint
): Promise<void> {
  const erc20Abi = ['function approve(address spender, uint256 amount) returns (bool)'];
  const token = new Contract(tokenAddress, erc20Abi, signer);
  const tx = await token.approve(spender, amount);

  await tx.wait();
}

/**
 * Impersonate an account and transfer ERC20 tokens
 * Useful when storage manipulation doesn't work for proxy contracts
 */
export async function transferERC20FromWhale(
  rpcUrl: string,
  tokenAddress: string,
  whaleAddress: string,
  recipient: string,
  amount: bigint
): Promise<void> {
  const provider = new JsonRpcProvider(rpcUrl, undefined, { staticNetwork: true });

  // Normalize addresses
  const normalizedWhale = getAddress(whaleAddress.toLowerCase());

  // Impersonate the whale
  await provider.send('anvil_impersonateAccount', [normalizedWhale]);

  // Fund whale with ETH for gas
  await provider.send('anvil_setBalance', [normalizedWhale, '0x56BC75E2D63100000']); // 100 ETH

  const erc20Abi = ['function transfer(address to, uint256 amount) returns (bool)'];
  const impersonatedSigner = await provider.getSigner(normalizedWhale);
  const token = new Contract(tokenAddress, erc20Abi, impersonatedSigner);

  const tx = await token.transfer(recipient, amount);

  await tx.wait();

  // Stop impersonating
  await provider.send('anvil_stopImpersonatingAccount', [normalizedWhale]);
}

