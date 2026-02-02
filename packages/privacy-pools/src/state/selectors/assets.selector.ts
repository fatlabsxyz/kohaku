import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../store";
import { createMyPoolsSelector } from "./pools.selector";
import { selectEntityMap } from "../utils/selectors.utils";

export const assetSelector = selectEntityMap((state) => state.assets.assetsTuples)

export const createAreAssetsSyncedSelector = (
  myPoolsSelector: ReturnType<typeof createMyPoolsSelector>
) => {
  return createSelector(
    [
      myPoolsSelector,
      assetSelector,
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
      assetSelector,
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
