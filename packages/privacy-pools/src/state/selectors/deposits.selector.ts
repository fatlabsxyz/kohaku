import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { IPoolDepositEvent } from '../../data/interfaces/events.interface';
import { BaseSelectorParams } from '../interfaces/selectors.interface';

const selectChainId = (state: any, chainId: string) => chainId;
const selectEntrypoint = (state: any, entrypointAddress: string) => entrypointAddress;

export const createMyDepositsSelector = ({
  secretManager,
}: Pick<BaseSelectorParams, 'secretManager'>) => {
  return createSelector(
    [
      (state: RootState) => state.deposits.deposits,
      selectChainId,
      selectEntrypoint
    ],
    (depositsMap, chainId, entrypointAddress): IPoolDepositEvent[] => {
      const myDeposits: IPoolDepositEvent[] = [];

      for (let depositIndex = 0; ; depositIndex++) {
        const { precommitment } = secretManager.deriveSecrets({
          entrypointAddress,
          chainId: BigInt(chainId),
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

