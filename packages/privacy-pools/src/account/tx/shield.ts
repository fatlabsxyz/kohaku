import { HostInterface } from '../../types/host';
import { Address } from 'viem';
import { Interface } from 'ethers';
import { createTx, TxData } from '@kohaku-eth/provider';
import { PPv1NetworkConfig } from '../../config';
import { CommitmentActions } from '../actions/commitment';
import { Commitment } from '../types';
import { AssetId, U256 } from '../../types/base';

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

type CreateShieldContext = {
  network: PPv1NetworkConfig;
  actions: CommitmentActions;
};

export const makeCreateShield = async ({ network, actions }: CreateShieldContext): Promise<Shield> => {

  const shieldNative: ShieldFn = (_, value) => {
    // 1. Generate commitment
    const commitment = actions.createCommitment("0xee", value);

    // 2. Encode transaction
    const data = ENTRYPOINT_INTERFACE_NATIVE.encodeFunctionData('deposit', [commitment.hash]);
    const tx = createTx(network.ENTRYPOINT_ADDRESS, data, value);

    // Return both commitment and tx
    // User should: 1) submit tx, 2) wait for confirmation, 3) call addCommitment()
    return { commitment, tx };

  };

  const shieldErc20: ShieldFn = (token, value) => {
    // 1. Generate commitment
    const commitment = actions.createCommitment(token, value);

    // 2. Encode transaction
    const data = ENTRYPOINT_INTERFACE_ERC20.encodeFunctionData('deposit', [token, value, commitment.hash]);
    const tx = createTx(network.ENTRYPOINT_ADDRESS, data);

    // Return both commitment and tx
    // User should: 1) submit tx, 2) wait for confirmation, 3) call addCommitment()
    return { commitment, tx };
  };

  const shield: ShieldFn = (token, value) => {
    return isNative(token) ? shieldNative(token, value) : shieldErc20(token, value);
  };

  return { shield };
};

function isNative(token: string) {
  return token.toLowerCase() === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
}

type PrepareShieldContext = {
  host: HostInterface;
  shield: { asset: AssetId; amount: U256; };
};

export function prepareNativeShield(host: HostInterface, amount: bigint) {
    // 2. Encode transaction
    const data = ENTRYPOINT_INTERFACE_NATIVE.encodeFunctionData('deposit', [commitment.hash]);
    const tx = createTx(network.ENTRYPOINT_ADDRESS, data, value);

    // Return both commitment and tx
    // User should: 1) submit tx, 2) wait for confirmation, 3) call addCommitment()
    return { commitment, tx };
}

export function prepareErc20Shield(host: HostInterface, asset: string, amount: bigint) {
    
    // 1. Generate commitment
    const commitment = host.keystore.createCommitment(token, value);

    // 2. Encode transaction
    const data = ENTRYPOINT_INTERFACE_ERC20.encodeFunctionData('deposit', [token, value, commitment.hash]);
    const tx = createTx(network.ENTRYPOINT_ADDRESS, data);

    // Return both commitment and tx
    // User should: 1) submit tx, 2) wait for confirmation, 3) call addCommitment()
    return { commitment, tx };
}

export async function prepareShield({ host, shield }: PrepareShieldContext) {
  const { asset, amount } = shield;
  if (isNative(asset)) {
    return prepareNativeShield(host, amount);
  } else {
    return prepareErc20Shield(host, asset, amount);
  }
}
