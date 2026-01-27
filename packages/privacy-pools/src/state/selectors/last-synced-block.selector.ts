import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../store';

export const selectLastSyncedBlock = createSelector(
  [
    (state: RootState) => state.deposits.deposits,
    (state: RootState) => state.withdrawals.withdrawals,
    (state: RootState) => state.ragequits.ragequits,
  ],
  (depositsMap, withdrawalsMap, ragequitsMap): number => {
    let maxBlock = 0n;

    for (const deposit of depositsMap.values()) {
      if (deposit.blockNumber > maxBlock) {
        maxBlock = deposit.blockNumber;
      }
    }

    for (const withdrawal of withdrawalsMap.values()) {
      if (withdrawal.blockNumber > maxBlock) {
        maxBlock = withdrawal.blockNumber;
      }
    }

    for (const ragequit of ragequitsMap.values()) {
      if (ragequit.blockNumber > maxBlock) {
        maxBlock = ragequit.blockNumber;
      }
    }

    return Number(maxBlock);
  }
);
