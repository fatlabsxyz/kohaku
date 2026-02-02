import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { IEntrypointDepositEvent, IDepositWithAsset, IIndexedDepositEvent } from '../../data/interfaces/events.interface';
import { BaseSelectorParams } from '../interfaces/selectors.interface';
import { Address, Precommitment } from '../../interfaces/types.interface';
import { selectEntityMap } from '../utils/selectors.utils';
import { poolsSelector } from './pools.selector';
import { TxData } from '@kohaku-eth/provider';
import { prepareErc20Shield, prepareNativeShield } from '../../account/tx/shield';
import { E_ADDRESS } from '../../config';
import { addressToHex } from '../../utils';

export const depositsSelector = selectEntityMap((s) => s.deposits.depositsTuples);
export const entrypointDepositSelector = selectEntityMap((s) => s.entrypointDeposits.entrypointDepositsTuples);

export const createMyDepositsSelector = ({
  secretManager,
}: Pick<BaseSelectorParams, 'secretManager'>) => {
  return createSelector(
    [
      depositsSelector,
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
  myDepositsSelector: ReturnType<typeof createMyDepositsSelector>,
) => {
  return createSelector(
    [myDepositsSelector],
    (myDeposits): number => {
      return myDeposits.size;
    }
  );
};

export const createMyEntrypointDepositsSelector = (
  myDepositsSelector: ReturnType<typeof createMyDepositsSelector>,
) => {
  return createSelector(
    [
      myDepositsSelector,
      entrypointDepositSelector,
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
  myDepositsSelector: ReturnType<typeof createMyDepositsSelector>,
) => {
  return createSelector(
    [
      myDepositsSelector,
      entrypointDepositSelector,
      poolsSelector,
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

export const createGetNextDepositSecretsSelector = ({
  depositsCountSelector,
  secretManager,
}: {
  depositsCountSelector: ReturnType<typeof createMyDepositsCountSelector>;
  secretManager: BaseSelectorParams['secretManager'];
}) => {
  return createSelector(
    [
      depositsCountSelector,
      (state: RootState) => state.poolInfo,
    ],
    (depositCount, { chainId, entrypointAddress }) => {
      return secretManager.getDepositSecrets({
        entrypointAddress,
        chainId,
        depositIndex: depositCount + 1,
      });
    }
  );
};

export const createGetNextDepositPayloadSelector = ({
  getNextDepositSecretsSelector,
}: {
  getNextDepositSecretsSelector: ReturnType<typeof createGetNextDepositSecretsSelector>;
}) => {
  return createSelector(
    [
      getNextDepositSecretsSelector,
      (_state: RootState, asset: Address, _amount: bigint) => asset,
      (_state: RootState, _asset: Address, amount: bigint) => amount,
      (state: RootState) => state.poolInfo.entrypointAddress,
    ],
    ({ precommitment }, asset, amount, entrypoint): TxData => {
      const assetHex = addressToHex(asset);
      const entrypointHex = addressToHex(entrypoint);
      const isNative = assetHex.toLowerCase() === E_ADDRESS;

      if (isNative) {
        return prepareNativeShield({
          precommitment,
          amount,
          entrypointAddress: entrypointHex,
        });
      } else {
        return prepareErc20Shield({
          precommitment,
          amount,
          tokenAddress: assetHex,
          entrypointAddress: entrypointHex,
        });
      }
    }
  );
};
