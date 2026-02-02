import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../store";

export const aspSelector = (state: RootState) => state.asp;
export const lastUpdateRootEventSelector = (state: RootState) => state.updateRootEvents.lastUpdateRootEvent;

export const isAspRootUpToDateSelector = createSelector(
  [
    aspSelector,
    lastUpdateRootEventSelector,
  ],
  (asp, lastUpdateRootEvent): boolean => {
    if (!lastUpdateRootEvent) {
      return false;
    }

    return asp.aspTreeRoot === lastUpdateRootEvent.root &&
           asp.blockNumber === lastUpdateRootEvent.blockNumber;
  }
);

export const aspLeavesSelector = createSelector(
  [aspSelector],
  ({ leaves }) => new Set(leaves)
);
