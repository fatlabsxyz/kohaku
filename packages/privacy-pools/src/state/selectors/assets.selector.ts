import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../store";
import { createMyPoolsSelector } from "./pools.selector";

export const createAreAssetsSyncedSelector = (
  myPoolsSelector: ReturnType<typeof createMyPoolsSelector>
) => {
  return createSelector(
    [
      myPoolsSelector,
      (state: RootState) => state.assets.assets,
    ],
    (myPools, assets): boolean => {
      const uniqueAssetAddresses = new Set(
        myPools.map(({ assetAddress }) => assetAddress.toString())
      );
      return uniqueAssetAddresses.size === assets.size;
    }
  );
};

export const createMyUnsyncedAssetsSelector = (
  myPoolsSelector: ReturnType<typeof createMyPoolsSelector>
) => {
  return createSelector(
    [
      myPoolsSelector,
      (state: RootState) => state.assets.assets,
    ],
    (myPools, assets): bigint[] => {
      const uniqueAssetAddresses = new Set(
        myPools.map(({ assetAddress }) => assetAddress)
      );

      return Array.from(uniqueAssetAddresses).filter(
        (address) => !assets.has(address)
      );
    }
  );
};
