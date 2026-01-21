import { Address } from 'viem';
import { Interface } from 'ethers';
import { createTx, TxData } from '@kohaku-eth/provider';
import { PPv1NetworkConfig } from '../../config';
import { CommitmentActions } from '../actions/commitment';
import { Nullifier } from '../types';

export type UnshieldFn = (token: Address, value: bigint, recipient: Address) => {
  nullifiers: Nullifier[];
  tx: TxData;
};
export type Unshield = { unshield: UnshieldFn };

const POOL_ABI = [
  'function unshield(bytes proof, bytes32[] nullifiers, address recipient, address token, uint256 value) external'
];

const POOL_INTERFACE = new Interface(POOL_ABI);

// Mock proof generation (stub)
const generateMockProof = (): string => {
  // Return dummy 128 bytes (typical zk-SNARK proof size)
  return '0x' + '00'.repeat(128);
};

export const makeUnshield = (
  network: PPv1NetworkConfig,
  actions: CommitmentActions
): Unshield => {

  const unshield: UnshieldFn = (token, value, recipient) => {
    // 1. Select unspent commitments
    const unspent = actions.getUnspentCommitments(token);

    let total = 0n;
    const selectedCommitments = [];

    for (const commitment of unspent) {
      selectedCommitments.push(commitment);
      total += commitment.value;

      if (total >= value) break;
    }

    if (total < value) {
      throw new Error(`Insufficient balance. Need ${value}, have ${total}`);
    }

    // 2. Generate nullifiers
    const nullifiers = selectedCommitments.map(c => actions.generateNullifier(c));

    // 3. Generate mock proof
    const proof = generateMockProof();

    // 4. Encode transaction
    const data = POOL_INTERFACE.encodeFunctionData('unshield', [
      proof,
      nullifiers.map(n => n.hash),
      recipient,
      token,
      value
    ]);

    const tx = createTx(network.POOL_ADDRESS, data);

    // Return nullifiers and tx
    // User should: 1) submit tx, 2) wait for confirmation, 3) call markSpent() for each nullifier
    return { nullifiers, tx };
  };

  return { unshield };
};
