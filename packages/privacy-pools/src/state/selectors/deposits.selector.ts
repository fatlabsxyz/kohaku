import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { IEntrypointDepositEvent, IDepositWithAsset, IIndexedDepositEvent } from '../../data/interfaces/events.interface';
import { BaseSelectorParams } from '../interfaces/selectors.interface';
import { Precommitment } from '../../interfaces/types.interface';

export const createMyDepositsSelector = ({
  secretManager,
}: Pick<BaseSelectorParams, 'secretManager'>) => {
  return createSelector(
    [
      (state: RootState) => state.deposits.deposits,
      (state: RootState) => state.poolInfo
    ],
    (depositsMap, {chainId, entrypointAddress}): Map<Precommitment, IIndexedDepositEvent> => {
      const myDeposits: IIndexedDepositEvent[] = [];

      for (let depositIndex = 0; ; depositIndex++) {
        const { precommitment } = secretManager.getDepositSecrets({
          entrypointAddress,
          chainId,
          depositIndex,
        });

        const deposit = depositsMap.get(precommitment);

        if (!deposit) {
          break;
        }

        myDeposits.push({
          ...deposit,
          index: depositIndex,
        });
      }

      return new Map(myDeposits.map((deposit) => [deposit.precommitment, deposit] as const));
    }
  );
};

export const createMyDepositsCountSelector = (
  ...params: Parameters<typeof createMyDepositsSelector>
) => {
  const myDepositsSelector = createMyDepositsSelector(...params);

  return createSelector(
    [myDepositsSelector],
    (myDeposits): number => {
      return myDeposits.size;
    }
  );
};

export const createMyEntrypointDepositsSelector = (
  ...params: Parameters<typeof createMyDepositsSelector>
) => {
  const myDepositsSelector = createMyDepositsSelector(...params);

  return createSelector(
    [
      myDepositsSelector,
      (state: RootState) => state.entrypointDeposits.entrypointDeposits,
    ],
    (myDeposits, entrypointDepositsMap): Map<Precommitment, IEntrypointDepositEvent> => {
      const entrypointDepositByPrecommitment = Array.from(myDeposits)
        .map(([precommitment, { commitment }]) => [precommitment, entrypointDepositsMap.get(commitment)] as const)
        .filter(([_, e]) => e !== undefined);

      return new Map(entrypointDepositByPrecommitment as [Precommitment, IEntrypointDepositEvent][])
    }
  );
};

export const createMyDepositsWithAssetSelector = (
  ...params: Parameters<typeof createMyDepositsSelector>
) => {
  const myDepositsSelector = createMyDepositsSelector(...params);

  return createSelector(
    [
      myDepositsSelector,
      (state: RootState) => state.entrypointDeposits.entrypointDeposits,
      (state: RootState) => state.pools.pools,
    ],
    (myDeposits, entrypointDepositsMap, poolsMap): Map<Precommitment, IDepositWithAsset> => {
      const depositsWithAssets = Array.from(myDeposits)
        .map(([precommitment, deposit]) => {
          const entrypointDeposit = entrypointDepositsMap.get(deposit.commitment);
          if (!entrypointDeposit) return undefined;

          const pool = poolsMap.get(entrypointDeposit.poolAddress);
          if (!pool) return undefined;

          return [precommitment, {
            ...deposit,
            assetAddress: pool.assetAddress,
          }] as const;
        })
        .filter((e) => e !== undefined);

      return new Map(depositsWithAssets)
    }
  );
};
