import { createSelector } from '@reduxjs/toolkit';
import { IDepositWithAsset } from '../../data/interfaces/events.interface';
import { createMyWithdrawalsSelector } from './withdrawals.selector';
import { createMyRagequitsSelector } from './ragequits.selector';
import { createMyDepositsWithAssetSelector } from './deposits.selector';
import { Address, Precommitment } from '../../interfaces/types.interface';

export interface IDepositWithBalance extends IDepositWithAsset {
  balance: bigint;
}

export const createMyDepositsBalanceSelector = ({
  myWithdrawalsSelector,
  myRagequitsSelector,
  myDepositsWithAssetSelector
}: {
  myWithdrawalsSelector: ReturnType<typeof createMyWithdrawalsSelector>,
  myRagequitsSelector: ReturnType<typeof createMyRagequitsSelector>,
  myDepositsWithAssetSelector: ReturnType<typeof createMyDepositsWithAssetSelector>,
}) => {

  return createSelector(
    [
      myWithdrawalsSelector,
      myRagequitsSelector,
      myDepositsWithAssetSelector,
    ],
    (withdrawalsMap, ragequitsMap, myDeposits): Map<Precommitment, IDepositWithBalance> => {
      const depositsByPrecommitment = Array.from(myDeposits.entries())
        .map(([precommitment, deposit]): [Precommitment, IDepositWithBalance] => {
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

export class NotEnoughCommitsToSpendError extends Error {}

export const createDepositsToSpendSelector = ({
  myDepositsBalanceSelector,
}: {myDepositsBalanceSelector: ReturnType<typeof createMyDepositsBalanceSelector>}) => {

  return createSelector(
    [
      myDepositsBalanceSelector,
      (_state: any, assetAddress: bigint, amount: bigint) => ({ assetAddress, amount }),
    ],
    (depositsMap, { assetAddress, amount }): IDepositWithBalance[] => {
      // Filter deposits by asset address and positive balance
      const filteredDeposits = Array.from(depositsMap.values())
        .filter(deposit => deposit.assetAddress === assetAddress && deposit.balance > 0n);

      const depositsToSpend: IDepositWithBalance[] = [];
      let remainingAmount = amount;

      for (const deposit of filteredDeposits) {
        if (remainingAmount <= 0n) {
          break;
        }

        depositsToSpend.push(deposit);
        remainingAmount -= deposit.balance;
      }

      if ( remainingAmount > 0 ) {
        throw new NotEnoughCommitsToSpendError(`Remaining ${remainingAmount.toString(10)} to spend.`);
      }

      return depositsToSpend;
    }
  );
};

interface IAssetBalance {
  approved: bigint;
  unapproved: bigint;
}

export const createMyAssetsBalanceSelector = ({
  myDepositsBalanceSelector,
}: {myDepositsBalanceSelector: ReturnType<typeof createMyDepositsBalanceSelector>}) => {

  return createSelector(
    [myDepositsBalanceSelector],
    (depositsMap): Map<Address, IAssetBalance> => {
      const assetsBalanceMap = new Map<bigint, IAssetBalance>();

      for (const deposit of depositsMap.values()) {
        const currentBalance = assetsBalanceMap.get(deposit.assetAddress) || { approved: 0n, unapproved: 0n };
        const balanceKey = deposit.approved ? 'approved' : 'unapproved';

        assetsBalanceMap.set(deposit.assetAddress, {
          ...currentBalance,
          [balanceKey]: currentBalance[balanceKey] + deposit.value,
        });
      }

      return assetsBalanceMap;
    }
  );
};

export const createSpecificAssetBalanceSelector = (
  myAssetsBalanceSelector: ReturnType<typeof createMyAssetsBalanceSelector>
) => {
  return createSelector(
    [
      myAssetsBalanceSelector,
      (_state: any, assetAddress: Address) => assetAddress,
    ],
    (assetsBalanceMap, assetAddress): IAssetBalance => {
      return assetsBalanceMap.get(assetAddress) || { approved: 0n, unapproved: 0n };
    }
  );
};

export const createMyApprovedAssetBalanceSelector = (
  myAssetsBalanceSelector: ReturnType<typeof createMyAssetsBalanceSelector>
) => {
  return createSelector(
    [
      myAssetsBalanceSelector,
    ],
    (assetsBalanceMap): Map<Address, bigint> => {
      return new Map(
        Array.from(assetsBalanceMap)
        .map(([assetAddress, balance]) => [assetAddress, balance.approved] as const),
      )
    }
  );
};
