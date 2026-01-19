import { Address } from 'viem';
import { Interface } from 'ethers';
import { createTx, TxData } from '@kohaku-eth/provider';
import { NetworkConfig } from '../../config';
import { CommitmentActions } from '../actions/commitment';
import { Commitment } from '../types';

export type ShieldFn = (token: Address, value: bigint) => { commitment: Commitment; tx: TxData; };
export type Shield = { shield: ShieldFn; };

const POOL_ABI_NATIVE = [
  'function deposit(uint256 _precommitment) external payable returns (uint256 _commitment)',
];

const POOL_ABI_ERC20 = [
  'function deposit(address _asset, uint256 _value, uint256 _precommitment) external returns (uint256 _commitment)',
];

const POOL_INTERFACE_NATIVE = new Interface(POOL_ABI_NATIVE);
const POOL_INTERFACE_ERC20 = new Interface(POOL_ABI_ERC20);

export const makeShield = (
  network: NetworkConfig,
  actions: CommitmentActions
): Shield => {

  const shield: ShieldFn = (token, value) => {
    // 1. Generate commitment
    const commitment = actions.createCommitment(token, value);

    const depositArgs = isNative(token) ? [commitment.hash] : [token, value, commitment.hash];
    const txValue = isNative(token) ? value : undefined;
    const POOL_INTERFACE = isNative(token) ? POOL_INTERFACE_NATIVE : POOL_INTERFACE_ERC20;

    // 2. Encode transaction
    const data = POOL_INTERFACE.encodeFunctionData('deposit', depositArgs);

    const tx = createTx(network.POOL_ADDRESS, data, txValue);

    // Return both commitment and tx
    // User should: 1) submit tx, 2) wait for confirmation, 3) call addCommitment()
    return { commitment, tx };
  };

  return { shield };
};

function isNative(token: string) {
  return token.toLowerCase() === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
}
