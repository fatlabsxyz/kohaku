import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { IEntrypointDepositEvent, IIndexedDepositEvent } from '../../data/interfaces/events.interface';
import { BaseSelectorParams } from '../interfaces/selectors.interface';
import { Address, Precommitment } from '../../interfaces/types.interface';
import { TxData } from '@kohaku-eth/provider';
import { prepareErc20Shield, prepareNativeShield } from '../../account/tx/shield';
import { E_ADDRESS } from '../../config';
import { addressToHex } from '../../utils';
import { depositsSelector, entrypointDepositSelector, poolInfoSelector } from './slices.selectors';
import { aspLeavesSelector } from './asp.selector';

export const createMyDepositsSelector = ({
  secretManager,
}: Pick<BaseSelectorParams, 'secretManager'>) => {
  return createSelector(
    [
      depositsSelector,
      aspLeavesSelector,
      poolInfoSelector,
    ],
    (depositsMap, approvedLabels, {chainId, entrypointAddress}): Map<Precommitment, IIndexedDepositEvent> => {
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
          approved: approvedLabels.has(deposit.label),
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
      poolInfoSelector,
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
      poolInfoSelector,
    ],
    ({ precommitment }, asset, amount, { entrypointAddress }): TxData => {
      const assetHex = addressToHex(asset);
      const entrypointHex = addressToHex(entrypointAddress);
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
