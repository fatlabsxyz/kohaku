import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { IPoolDepositEvent, IEntrypointDepositEvent, IPool } from '../../data/interfaces/events.interface';
import { BaseSelectorParams } from '../interfaces/selectors.interface';
import { EvmChainId } from '../../types/base';

const selectChainId = (state: RootState, chainId: EvmChainId) => chainId;

export const createMyDepositsSelector = ({
  secretManager,
  entrypointAddress
}: Pick<BaseSelectorParams, 'secretManager' | 'entrypointAddress'>) => {
  return createSelector(
    [
      (state: RootState) => state.deposits.deposits,
      selectChainId,
    ],
    (depositsMap, chainId): IPoolDepositEvent[] => {
      const myDeposits: IPoolDepositEvent[] = [];

      for (let depositIndex = 0; ; depositIndex++) {
        const { precommitment } = secretManager.getDepositSecrets({
          entrypointAddress: entrypointAddress(chainId),
          chainId: chainId.chainId,
          depositIndex,
        });

        const deposit = depositsMap.get(precommitment);

        if (!deposit) {
          break;
        }

        myDeposits.push(deposit);
      }

      return myDeposits;
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
      return myDeposits.length;
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
    (myDeposits, entrypointDepositsMap): IEntrypointDepositEvent[] => {
      return myDeposits
        .map(({ commitment }) => entrypointDepositsMap.get(commitment))
        .filter((e) => e !== undefined);
    }
  );
};
