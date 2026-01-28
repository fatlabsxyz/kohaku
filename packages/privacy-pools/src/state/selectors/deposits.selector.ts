import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { IPoolDepositEvent } from '../../data/interfaces/events.interface';
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

        const key = precommitment.toString();
        const deposit = depositsMap.get(key);

        if (!deposit) {
          break;
        }

        myDeposits.push(deposit);
      }

      return myDeposits;
    }
  );
};

export const createMyDepositsCountSelector = (params: Pick<BaseSelectorParams, 'secretManager' | 'entrypointAddress'>) => {
  const myDepositsSelector = createMyDepositsSelector(params);

  return createSelector(
    [myDepositsSelector],
    (myDeposits): number => {
      return myDeposits.length;
    }
  );
};
