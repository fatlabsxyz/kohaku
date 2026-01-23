import { HostInterface } from '../../types/host';
import { Interface } from 'ethers';
import { createTx, TxData } from '@kohaku-eth/provider';
import { Commitment } from '../types';
import { Address, AssetId, U256 } from '../../types/base';
import { Secret } from '../keys';

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

function isNative(token: string) {
  return token.toLowerCase() === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
}

type PrepareShieldContext = {
  host: HostInterface;
  secret: Secret;
  shield: { asset: AssetId; amount: U256; };
};

type PrepareNativeShieldParam = {
  precommitment: bigint;
  amount: U256;
  entrypointAddress: string;
};

type PrepareErc20ShieldParam = {
  precommitment: bigint;
  amount: U256;
  tokenAddress: string;
  entrypointAddress: string;
};

export function prepareNativeShield({ precommitment, amount, entrypointAddress }: PrepareNativeShieldParam) {
  const data = ENTRYPOINT_INTERFACE_NATIVE.encodeFunctionData('deposit', [precommitment]);
  const tx = createTx(entrypointAddress, data, amount);

  return { tx };
}

export function prepareErc20Shield({ precommitment, amount, tokenAddress, entrypointAddress }: PrepareErc20ShieldParam) {
  const data = ENTRYPOINT_INTERFACE_ERC20.encodeFunctionData('deposit', [tokenAddress, amount, precommitment]);
  const tx = createTx(entrypointAddress, data);

  return { tx };
}

type PrepareShieldContextWithEntrypoint = PrepareShieldContext & {
  entrypointAddress: string;
};

export async function prepareShield({ secret: { precommitment }, shield, entrypointAddress }: PrepareShieldContextWithEntrypoint) {
  const { asset, amount } = shield;

  if (asset.assetType.kind !== "Erc20") {
    throw new Error(`Asset type \`${asset.assetType.kind}\` not supported.`);
  }

  const { assetType: { address } } = asset;

  if (isNative(address)) {
    return prepareNativeShield({ precommitment, amount, entrypointAddress });
  } else {
    return prepareErc20Shield({ precommitment, amount, tokenAddress: address, entrypointAddress });
  }
}
