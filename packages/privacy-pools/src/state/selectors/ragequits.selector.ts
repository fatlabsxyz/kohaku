import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { IRagequitEvent } from '../../data/interfaces/events.interface';
import { createMyDepositsSelector } from './deposits.selector';
import { Precommitment } from '../../interfaces/types.interface';

export const createMyRagequitsSelector = (
  myDepositsSelector: ReturnType<typeof createMyDepositsSelector>
) => {
  return createSelector(
    [
      myDepositsSelector,
      (state: RootState) => state.ragequits.ragequits,
    ],
    (myDeposits, ragequitsMap): Map<Precommitment, IRagequitEvent> => {
      return Array.from(myDeposits.values())
        .reduce((ragequitsByPrecommitment, deposit) => {
          const ragequit = ragequitsMap.get(deposit.label);
          if (ragequit) {
            ragequitsByPrecommitment.set(deposit.precommitment, ragequit);
          }
          return ragequitsByPrecommitment; 
        }, new Map<Precommitment, IRagequitEvent>());
    }
  );
};
