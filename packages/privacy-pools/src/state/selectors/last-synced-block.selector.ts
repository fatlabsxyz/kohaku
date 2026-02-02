import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { depositsSelector } from './deposits.selector';
import { withdrawalsSelector } from './withdrawals.selector';
import { ragequitsSelector } from './ragequits.selector';

export const selectLastSyncedBlock = createSelector(
  [
    depositsSelector,
    withdrawalsSelector,
    ragequitsSelector,
    (state: RootState) => state.sync.lastSyncedBlock,
  ],
  (depositsMap, withdrawalsMap, ragequitsMap, lastSyncedBlock): bigint => {
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

    if (lastSyncedBlock > maxBlock) {
      maxBlock = lastSyncedBlock;
    }

    return maxBlock;
  }
);
