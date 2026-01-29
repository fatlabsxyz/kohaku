import { createSelector } from "@reduxjs/toolkit";
import { IPool } from "../../data/interfaces/events.interface";
import { RootState } from "../store";
import { createMyDepositsSelector, createMyEntrypointDepositsSelector } from "./deposits.selector";

export const createMyPoolsSelector = (
  myEntrypointDepositsSelector: ReturnType<typeof createMyEntrypointDepositsSelector>
) => {
  return createSelector(
    [
      myEntrypointDepositsSelector,
      (state: RootState) => state.pools.pools,
    ],
    (myEntrypointDeposits, pools): IPool[] => {
      return Array.from(new Set(
        Array.from(myEntrypointDeposits.values())
          .map(({ poolAddress }) => poolAddress)
      ))
        .map((poolAddress) => pools.get(poolAddress))
        .filter((pool) => !!pool);
    }
  );
};

export const createMyUnsyncedPoolsAddresses = (
  myEntrypointDepositsSelector: ReturnType<typeof createMyEntrypointDepositsSelector>
) => {
  return createSelector(
    [
      myEntrypointDepositsSelector,
      (state: RootState) => state.pools.pools,
    ],
    (myEntrypointDeposits, pools): bigint[] => {
      const uniquePoolAddresses = new Set(
        Array.from(myEntrypointDeposits.values())
          .map(({ poolAddress }) => poolAddress)
      );

      return Array.from(uniquePoolAddresses).filter(
        (address) => !pools.has(address)
      );
    }
  );
};
