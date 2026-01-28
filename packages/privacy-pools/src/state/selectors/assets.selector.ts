import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../store";
import { createMyPoolsSelector, createMyUnsyncedPoolsAddresses } from "./pools.selector";

export const createAreAssetsSyncedSelector = (
  ...params: Parameters<typeof createMyPoolsSelector>
) => {
  const myPoolsSelector = createMyPoolsSelector(...params);

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
  ...params: Parameters<typeof createMyPoolsSelector>
) => {
  const myPoolsSelector = createMyPoolsSelector(...params);

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
