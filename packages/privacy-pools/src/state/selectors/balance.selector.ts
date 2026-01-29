import { createSelector } from '@reduxjs/toolkit';
import { IDepositWithAsset } from '../../data/interfaces/events.interface';
import { BaseSelectorParams } from '../interfaces/selectors.interface';
import { createMyWithdrawalsSelector } from './withdrawals.selector';
import { createMyRagequitsSelector } from './ragequits.selector';
import { createMyDepositsWithAssetSelector } from './deposits.selector';
import { Precommitment } from '../../interfaces/types.interface';

interface IDepositWithBalance extends IDepositWithAsset {
  balance: bigint;
}

export const createMyDepositsBalanceSelector = ({
  secretManager,
}: Pick<BaseSelectorParams, 'secretManager'>) => {
  const myWithdrawalsSelector = createMyWithdrawalsSelector({ secretManager });
  const myRagequitsSelector = createMyRagequitsSelector({ secretManager });
  const myDepositsWithAssetSelector = createMyDepositsWithAssetSelector({ secretManager });

  return createSelector(
    [
      myWithdrawalsSelector,
      myRagequitsSelector,
      myDepositsWithAssetSelector,
    ],
    (withdrawalsMap, ragequitsMap, myDeposits): Map<Precommitment, IDepositWithBalance> => {
      const depositsByPrecommitment = Array.from(myDeposits.entries())
        .map(([precommitment, deposit]) => {
          const depositData = myDeposits.get(deposit.precommitment);
    
          if (!depositData) {
            return [precommitment, {
              ...deposit,
              assetAddress: 0n,
              index: 0,
              balance: 0n,
            }] as const;
          }
    
          const ragequit = ragequitsMap.get(depositData.precommitment);
          if (ragequit) {
            return [precommitment, {
              ...depositData,
              balance: 0n,
            }] as const;
          }
    
          const withdrawals = withdrawalsMap.get(depositData.precommitment) || [];
          const totalWithdrawn = withdrawals.reduce((sum, withdrawal) => sum + withdrawal.value, 0n);
    
          return [precommitment, {
            ...depositData,
            balance: depositData.value - totalWithdrawn,
          }] as const;
        });

      return new Map(depositsByPrecommitment);
    }
  );
};

