import { createTx, TxData } from '@kohaku-eth/provider';
import { Interface } from 'ethers';
import { Address } from "viem";
import { Commitment } from '../types';

export type ShieldFn = (token: Address, value: bigint) => { commitment: Commitment; tx: TxData; };
export type Shield = { shield: ShieldFn; };

const ENTRYPOINT_ABI_NATIVE = [
  'function deposit(uint256 _precommitment) external payable returns (uint256 _commitment)',
];

const ENTRYPOINT_ABI_ERC20 = [
  'function deposit(address _asset, uint256 _value, uint256 _precommitment) external returns (uint256 _commitment)',
];

const ENTRYPOINT_INTERFACE_NATIVE = new Interface(ENTRYPOINT_ABI_NATIVE);
const ENTRYPOINT_INTERFACE_ERC20 = new Interface(ENTRYPOINT_ABI_ERC20);

type PrepareNativeShieldParam = {
  precommitment: bigint;
  amount: bigint;
  entrypointAddress: string;
};

type PrepareErc20ShieldParam = {
  precommitment: bigint;
  amount: bigint;
  tokenAddress: string;
  entrypointAddress: string;
};

export function prepareNativeShield({ precommitment, amount, entrypointAddress }: PrepareNativeShieldParam) {
  const data = ENTRYPOINT_INTERFACE_NATIVE.encodeFunctionData('deposit', [precommitment]);

  return createTx(entrypointAddress, data, amount);
}

export function prepareErc20Shield({ precommitment, amount, tokenAddress, entrypointAddress }: PrepareErc20ShieldParam) {
  const data = ENTRYPOINT_INTERFACE_ERC20.encodeFunctionData('deposit', [tokenAddress, amount, precommitment]);

  return createTx(entrypointAddress, data);
}
