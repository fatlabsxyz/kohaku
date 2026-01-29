import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { IIndexedWithdrawalEvent } from '../../data/interfaces/events.interface';
import { createMyDepositsSelector } from './deposits.selector';
import { Precommitment } from '../../interfaces/types.interface';
import { ISecretManager } from '../../account/keys';

export type DepositsWithdrawals = Map<Precommitment, IIndexedWithdrawalEvent[]>;

export const createMyWithdrawalsSelector = ({
  secretManager,
  myDepositsSelector
}: {
  secretManager: ISecretManager;
  myDepositsSelector: ReturnType<typeof createMyDepositsSelector>;
}) => {
  /**
   * Returns the withdrawals grouped by deposit precommitment
   */
  return createSelector(
    [
      myDepositsSelector,
      (state: RootState) => state.withdrawals.withdrawals,
      (state: RootState) => state.poolInfo,
    ],
    (myDeposits, withdrawalsMap, {chainId, entrypointAddress}): DepositsWithdrawals => {
      const myWithdrawals: DepositsWithdrawals = new Map();

      for (const [, deposit] of myDeposits) {
        const mapKey = deposit.precommitment;
        const depositWithdrawals = myWithdrawals.get(mapKey) || [];
        for (let withdrawIndex = 0; ; withdrawIndex++) {
          const { nullifier } = secretManager.getSecrets({
            entrypointAddress,
            chainId,
            depositIndex: deposit.index,
            withdrawIndex,
          });

          const withdrawal = withdrawalsMap.get(nullifier);

          if (!withdrawal) {
            break;
          }
          
          depositWithdrawals.push({
            ...withdrawal,
            label: deposit.label,
            index: withdrawIndex,
          });
        }
        myWithdrawals.set(mapKey, depositWithdrawals);
      }

      return myWithdrawals;
    }
  );
};
