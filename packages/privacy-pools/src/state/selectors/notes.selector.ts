import { createSelector } from '@reduxjs/toolkit';
import { ISecretManager, Secret } from '../../account/keys';
import { Address } from '../../interfaces/types.interface';
import { Note } from '../../plugin/interfaces/protocol-params.interface';
import { createMyDepositsBalanceSelector } from './balance.selector';
import { createMyWithdrawalsSelector } from './withdrawals.selector';

/**
 * Creates a selector that finds the smallest sufficient note for a withdrawal.
 * Returns undefined if no note has sufficient balance.
 */
export const createGetNoteSelector = ({
  myDepositsBalanceSelector,
  myWithdrawalsSelector,
}: {
  myDepositsBalanceSelector: ReturnType<typeof createMyDepositsBalanceSelector>;
  myWithdrawalsSelector: ReturnType<typeof createMyWithdrawalsSelector>;
}) => {
  return createSelector(
    [
      myDepositsBalanceSelector,
      myWithdrawalsSelector,
      (_state: unknown, assetAddress: Address, _minAmount: bigint) => assetAddress,
      (_state: unknown, _assetAddress: Address, minAmount: bigint) => minAmount,
    ],
    (depositsMap, withdrawalsMap, assetAddress, minAmount): Note | undefined => {
      // Filter deposits by asset and sufficient balance
      const eligibleDeposits = Array.from(depositsMap.values())
        .filter(deposit => deposit.assetAddress === assetAddress && deposit.balance >= minAmount);

      if (eligibleDeposits.length === 0) {
        return undefined;
      }

      // Sort by balance ascending to get smallest sufficient
      eligibleDeposits.sort((a, b) => {
        if (a.balance < b.balance) return -1;

        if (a.balance > b.balance) return 1;

        return 0;
      });

      const bestDeposit = eligibleDeposits[0]!;

      // Get withdrawal count for this deposit (next withdrawal index)
      const withdrawals = withdrawalsMap.get(bestDeposit.precommitment) || [];
      const withdrawIndex = withdrawals.length;

      return {
        precommitment: bestDeposit.precommitment,
        label: bestDeposit.label,
        value: bestDeposit.balance, // Current spendable balance
        deposit: bestDeposit.index,
        withdraw: withdrawIndex,
      };
    }
  );
};

type NextNoteResult = {
  note: Note;
  secrets: Secret;
};

/**
 * Creates a function that computes the next note in a label lineage after a withdrawal.
 * This is not a Redux selector since it doesn't depend on state, only on secretManager.
 */
export const createNextNoteDeriver = ({
  secretManager,
}: {
  secretManager: ISecretManager;
}) => {
  return (
    note: Note,
    withdrawAmount: bigint,
    chainId: bigint,
    entrypointAddress: Address
  ): NextNoteResult => {
    const newValue = note.value - withdrawAmount;

    if (newValue < 0n) {
      throw new Error("Withdrawal amount exceeds note balance");
    }

    // Derive secrets for the next withdrawal index
    const secrets = secretManager.getSecrets({
      entrypointAddress,
      chainId,
      depositIndex: note.deposit,
      withdrawIndex: note.withdraw + 1,
    });

    return {
      note: {
        precommitment: secrets.precommitment,
        label: note.label,
        value: newValue,
        deposit: note.deposit,
        withdraw: note.withdraw + 1,
      },
      secrets,
    };
  };
};

/**
 * Creates a deriver function that gets secrets for an existing note.
 * Used to retrieve the secrets needed for spending an existing note in a withdrawal.
 */
export const createExistingNoteSecretsDeriver = ({
  secretManager,
}: {
  secretManager: ISecretManager;
}) => {
  return (
    note: Note,
    chainId: bigint,
    entrypointAddress: Address
  ): Secret => {
    return secretManager.getSecrets({
      entrypointAddress,
      chainId,
      depositIndex: note.deposit,
      withdrawIndex: note.withdraw,
    });
  };
};
