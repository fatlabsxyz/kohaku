import { Eip155ChainId } from "@kohaku-eth/plugins";

import { Address } from "../interfaces/types.interface";
import { IDepositOperationParams, IRagequitOperationParams, IStateManager, IWithdrawapOperationParams } from "../plugin/interfaces/protocol-params.interface";
import { BaseSelectorParams } from "./interfaces/selectors.interface";
import { createMyUnsyncedAssetsSelector } from "./selectors/assets.selector";
import { createMyAssetsBalanceSelector, createMyDepositsBalanceSelector } from "./selectors/balance.selector";
import { createMyDepositsCountSelector, createMyDepositsSelector, createMyDepositsWithAssetSelector, createMyEntrypointDepositsSelector, createGetNextDepositSecretsSelector, createGetNextDepositPayloadSelector } from "./selectors/deposits.selector";
import { createMyPoolsSelector, createMyUnsyncedPoolsAddresses } from "./selectors/pools.selector";
import { createGetNoteSelector, createNextNoteDeriver } from "./selectors/notes.selector";
import { createMyRagequitsSelector } from "./selectors/ragequits.selector";
import { createMyWithdrawalsSelector } from "./selectors/withdrawals.selector";
import { storeFactory } from "./store";
import { syncThunk } from "./thunks/syncThunk";

export type StoreFactoryParams = BaseSelectorParams;

const storeByChainAndEntrypoint = (params: Omit<StoreFactoryParams, 'dataService'>) => {
  const chainStoreMap = new Map<string, ReturnType<typeof storeFactory>>();

  return {
    getChainStore: ({ chainId, entrypoint }: { chainId: Eip155ChainId<number>; entrypoint: Address; }) => {
      const chainKey = chainId.toString();
      const computedChainKey = `${chainKey}-${entrypoint}`;
      let store = chainStoreMap.get(computedChainKey);

      if (!store) {
        store = storeFactory({
          chainId: BigInt(chainId.reference),
          entrypointAddress: entrypoint,
        });
        chainStoreMap.set(computedChainKey, store);
      }

      // We need to tie the selectors instances to a specific store
      // so they can memoize correctly
      const myDepositsSelector = createMyDepositsSelector(params);
      const depositsCountSelector = createMyDepositsCountSelector(myDepositsSelector);
      const myRagequitsSelector = createMyRagequitsSelector(myDepositsSelector);
      const myEntrypointDepositsSelector = createMyEntrypointDepositsSelector(myDepositsSelector);
      const myDepositsWithAssetSelector = createMyDepositsWithAssetSelector(myDepositsSelector);
      const myWithdrawalsSelector = createMyWithdrawalsSelector({ myDepositsSelector, ...params });

      const myPoolsSelector = createMyPoolsSelector(myEntrypointDepositsSelector);
      const myUnsyncedPoolsSelector = createMyUnsyncedPoolsAddresses(myEntrypointDepositsSelector);
      const myUnsyncedAssetsSelector = createMyUnsyncedAssetsSelector(myPoolsSelector);
      const myDepositsBalanceSelector = createMyDepositsBalanceSelector({
        myDepositsWithAssetSelector,
        myRagequitsSelector,
        myWithdrawalsSelector
      });
      const myAssetsBalanceSelector = createMyAssetsBalanceSelector({ myDepositsBalanceSelector });

      // Note selectors for withdrawals
      const getNoteSelector = createGetNoteSelector({
        myDepositsBalanceSelector,
        myWithdrawalsSelector,
      });
      const getNextNote = createNextNoteDeriver({
        secretManager: params.secretManager,
      });

      // Deposit payload selectors
      const getNextDepositSecretsSelector = createGetNextDepositSecretsSelector({
        depositsCountSelector,
        secretManager: params.secretManager,
      });
      const getNextDepositPayloadSelector = createGetNextDepositPayloadSelector({
        getNextDepositSecretsSelector,
      });

      return {
        ...store,
        selectors: {
          depositsCount: () => depositsCountSelector(store.getState()),
          myUnsyncedAssetsSelector: () => myUnsyncedAssetsSelector(store.getState()),
          myUnsyncedPoolsSelector: () => myUnsyncedPoolsSelector(store.getState()),
          myAssetsBalanceSelector: () => myAssetsBalanceSelector(store.getState()),
          getNote: (assetAddress: Address, minAmount: bigint) =>
            getNoteSelector(store.getState(), assetAddress, minAmount),
          getNextNote,
          getNextDepositPayload: (asset: Address, amount: bigint) =>
            getNextDepositPayloadSelector(store.getState(), asset, amount),
        }
      };
    }
  };
};

export const storeStateManager = ({
  dataService,
  ...params
}: StoreFactoryParams): IStateManager => {
  const { getChainStore } = storeByChainAndEntrypoint(params);

  return {
    sync: async ({ chainId, entrypoint }): Promise<void> => {
      const store = getChainStore({ chainId, entrypoint });

      await store.dispatch(syncThunk({
        dataService,
        ...store.selectors
      }));
    },
    getBalances: ({
      assets = [], ...params
    }): Map<Address, bigint> => {
      const store = getChainStore(params);
      const balances = store.selectors.myAssetsBalanceSelector();

      if (assets.length === 0) {
        return balances;
      }

      return new Map(assets.map((address) => [address, balances.get(address) || 0n]));
    },
    getDepositPayload: async ({ chainId, entrypoint, asset, amount }: IDepositOperationParams) => {
      const store = getChainStore({ chainId, entrypoint });
      return store.selectors.getNextDepositPayload(asset, amount);
    },
    getWithdrawalPayloads: ({ chainId, entrypoint, asset, amount, recipient }: IWithdrawapOperationParams) => {
      const store = getChainStore({ chainId, entrypoint });

      // Get note with sufficient balance (smallest sufficient)
      const note = store.selectors.getNote(asset, amount ?? 0n);

      if (!note) {
        throw new Error("No note with sufficient balance for withdrawal");
      }

      // Get the change note (next note in the label lineage)
      const { note: changeNote, secrets } = store.selectors.getNextNote(
        note,
        amount ?? 0n,
        BigInt(chainId.reference),
        entrypoint
      );

      // TODO: ZK proof generation deferred
      // Return the payload structure for now
      return Promise.resolve([{
        note,
        changeNote,
        secrets,
        recipient,
        amount,
      }]);
    },
    getRagequitPayloads: function (params: IRagequitOperationParams): Promise<unknown[]> {
      throw new Error("Function not implemented.");
    },
  };
};
