import { Eip155ChainId, Storage } from "@kohaku-eth/plugins";
import { Prover } from "@fatsolutions/privacy-pools-core-circuits";

import { Address } from "../interfaces/types.interface";
import {
  IDepositOperationParams,
  IEntrypoint,
  IRagequitOperationParams,
  IStateManager,
  IWithdrawapOperationParams,
} from "../plugin/interfaces/protocol-params.interface";
import { IRelayerClient } from "../relayer/interfaces/relayer-client.interface";
import { BaseSelectorParams } from "./interfaces/selectors.interface";
import { createMyUnsyncedAssetsSelector } from "./selectors/assets.selector";
import {
  createMyApprovedAssetBalanceSelector,
  createMyAssetsBalanceSelector,
  createMyDepositsBalanceSelector,
  createMyDepositsWithAssetSelector,
  createMyUnapprovedAssetBalanceSelector,
} from "./selectors/balance.selector";
import {
  createGetNextDepositPayloadSelector,
  createGetNextDepositSecretsSelector,
  createMyDepositsCountSelector,
  createMyDepositsSelector,
  createMyEntrypointDepositsSelector,
} from "./selectors/deposits.selector";
import {
  createAspLeavesSelector,
  createAspMerkleProofSelector,
  createStateLeavesSelector,
  createStateMerkleProofSelector,
} from "./selectors/merkle.selector";
import {
  createExistingNoteSecretsDeriver,
  createGetNoteSelector,
  createNextNoteDeriver,
} from "./selectors/notes.selector";
import { createMyPoolsSelector } from "./selectors/pools.selector";
import { createMyRagequitsSelector } from "./selectors/ragequits.selector";
import { createMyWithdrawalsSelector } from "./selectors/withdrawals.selector";
import { RootState, storeFactory } from "./store";
import { SyncAspThunkParams } from "./thunks/syncAspThunk";
import { syncThunk } from "./thunks/syncThunk";
import { quoteThunk, QuoteResult } from "./thunks/quoteThunk";
import { withdrawThunk } from "./thunks/withdrawThunk";
import { Store } from "@reduxjs/toolkit";
import { deserialize } from "./utils/serialize.utils";

export interface StoreFactoryParams
  extends BaseSelectorParams, SyncAspThunkParams {
  relayerClient: IRelayerClient;
  relayersList: Map<string, string>;
  storageToSyncTo?: Storage;
  proverFactory: () => ReturnType<typeof Prover>;
  initialState?: Record<
    string,
    Parameters<typeof storeFactory>[0]["initialState"]
  >;
}

const initializeSelectors = <const T extends Store>({
  store,
  ...params
}: Omit<StoreFactoryParams, "dataService"> & { store: T; }) => {
  // We need to tie the selectors instances to a specific store
  // so they can memoize correctly
  const myDepositsSelector = createMyDepositsSelector(params);
  const depositsCountSelector =
    createMyDepositsCountSelector(myDepositsSelector);
  const myRagequitsSelector = createMyRagequitsSelector(myDepositsSelector);
  const myEntrypointDepositsSelector =
    createMyEntrypointDepositsSelector(myDepositsSelector);
  const myDepositsWithAssetSelector =
    createMyDepositsWithAssetSelector(myDepositsSelector);
  const myWithdrawalsSelector = createMyWithdrawalsSelector({
    myDepositsSelector,
    ...params,
  });

  const myPoolsSelector = createMyPoolsSelector(myEntrypointDepositsSelector);
  const myUnsyncedAssetsSelector =
    createMyUnsyncedAssetsSelector(myPoolsSelector);
  const myDepositsBalanceSelector = createMyDepositsBalanceSelector({
    myDepositsWithAssetSelector,
    myRagequitsSelector,
    myWithdrawalsSelector,
  });
  const myAssetsBalanceSelector = createMyAssetsBalanceSelector({
    myDepositsBalanceSelector,
  });
  const myApprovedAssetBalanceSelector = createMyApprovedAssetBalanceSelector(
    myAssetsBalanceSelector,
  );
  const myUnapprovedAssetBalanceSelector =
    createMyUnapprovedAssetBalanceSelector(myAssetsBalanceSelector);

  // Note selectors for withdrawals
  const getNoteSelector = createGetNoteSelector({
    myDepositsBalanceSelector,
    myWithdrawalsSelector,
  });
  const getNextNote = createNextNoteDeriver({
    secretManager: params.secretManager,
  });
  const getExistingNoteSecrets = createExistingNoteSecretsDeriver({
    secretManager: params.secretManager,
  });

  // Merkle proof selectors (mocked for now)
  const stateLeavesSelector = createStateLeavesSelector();
  const aspLeavesSelector = createAspLeavesSelector();
  const stateMerkleProofSelector =
    createStateMerkleProofSelector(stateLeavesSelector);
  const aspMerkleProofSelector =
    createAspMerkleProofSelector(aspLeavesSelector);

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

      myUnapprovedAssetBalanceSelector: () =>
        myUnapprovedAssetBalanceSelector(store.getState()),
      myApprovedAssetBalanceSelector: () =>
        myApprovedAssetBalanceSelector(store.getState()),
      myAssetsBalanceSelector: () => myAssetsBalanceSelector(store.getState()),

      getExistingNoteSecrets,
      getNextDepositPayload: (asset: Address, amount: bigint) =>
        getNextDepositPayloadSelector(store.getState(), asset, amount),
      getNextNote,
      getNote: (assetAddress: Address, minAmount: bigint) =>
        getNoteSelector(store.getState(), assetAddress, minAmount),

      myPoolsSelector: () => myPoolsSelector(store.getState()),
      myUnsyncedAssetsSelector: () =>
        myUnsyncedAssetsSelector(store.getState()),

      getAspMerkleProof: (label: bigint) =>
        aspMerkleProofSelector(store.getState(), label),
      getStateMerkleProof: (
        note: Parameters<typeof stateMerkleProofSelector>[1],
      ) => stateMerkleProofSelector(store.getState(), note),
    },
  };
};

interface GetChainStoreParams {
  chainId: Eip155ChainId<number>;
  entrypoint: IEntrypoint;
}

const getStoreKey = ({
  chainId,
  entrypoint: { address },
}: GetChainStoreParams): `${string}-${string}` =>
  `${chainId.toString()}-${address}`;
const getStoreStorageKey = (
  params: GetChainStoreParams,
): `privacy-pool-state-${ReturnType<typeof getStoreKey>}` =>
  `privacy-pool-state-${getStoreKey(params)}`;

const storeByChainAndEntrypoint = ({
  storageToSyncTo,
  initialState,
  ...params
}: Omit<StoreFactoryParams, "dataService">) => {
  const initialMapState = Object.entries(initialState || {}).map(
    ([key, state]) =>
      [
        key,
        initializeSelectors({
          ...params,
          store: storeFactory({
            entrypointInfo: deserialize(state!.entrypointInfo),
            initialState: state,
          }),
        }),
      ] as const,
  );

  const chainStoreMap = new Map<
    string,
    ReturnType<typeof initializeSelectors<ReturnType<typeof storeFactory>>>
  >(initialMapState);

  return {
    getChainStore: (getChainStoreParams: GetChainStoreParams) => {
      const {
        chainId,
        entrypoint: { address, deploymentBlock },
      } = getChainStoreParams;
      const computedChainKey = getStoreKey(getChainStoreParams);
      let storeWithSelectors = chainStoreMap.get(computedChainKey);

      const storedState = storageToSyncTo?.get(
        getStoreStorageKey(getChainStoreParams),
      );

      if (!storeWithSelectors) {
        const initialState: RootState | undefined = storedState
          ? JSON.parse(storedState)
          : undefined;
        const store = storeFactory({
          entrypointInfo: {
            chainId: BigInt(chainId.reference),
            entrypointAddress: address,
            deploymentBlock,
          },
          initialState,
        });

        storeWithSelectors = initializeSelectors({ ...params, store });
        chainStoreMap.set(computedChainKey, storeWithSelectors);
      }

      return storeWithSelectors;
    },
    getAllStores: (): ReturnType<IStateManager['dumpState']> => {
      return Array.from(chainStoreMap).reduce(
        (completeState, [chainKey, state]) => ({
          ...completeState,
          [chainKey]: state.getState(),
        }),
        {} as ReturnType<IStateManager['dumpState']>,
      );
    },
  };
};

export const storeStateManager = (
  params: StoreFactoryParams,
): IStateManager => {
  const { getChainStore, getAllStores } = storeByChainAndEntrypoint(params);
  const { storageToSyncTo } = params;

  const _mgr = {
    _getChainStore: getChainStore,
  };

  return {
    ..._mgr,
    sync: async (chainInfo): Promise<void> => {
      const store = getChainStore(chainInfo);

      await store.dispatch(
        syncThunk({
          ...params,
          ...store.selectors,
        }),
      );

      if (storageToSyncTo) {
        storageToSyncTo.set(
          getStoreStorageKey(chainInfo),
          JSON.stringify(store.getState()),
        );
      }
    },
    getBalances: ({
      assets = [],
      balanceType = "approved",
      ...params
    }): Map<Address, bigint> => {
      const {
        selectors: {
          myApprovedAssetBalanceSelector,
          myUnapprovedAssetBalanceSelector,
        },
      } = getChainStore(params);
      const balanceSelector =
        balanceType === "approved"
          ? myApprovedAssetBalanceSelector
          : myUnapprovedAssetBalanceSelector;
      const balances = balanceSelector();

      if (assets.length === 0) {
        return balances;
      }

      return new Map(
        assets.map((address) => [address, balances.get(address) || 0n]),
      );
    },
    getDepositPayload: async ({
      chainId,
      entrypoint,
      asset,
      amount,
    }: IDepositOperationParams) => {
      const store = getChainStore({ chainId, entrypoint });

      return store.selectors.getNextDepositPayload(asset, amount);
    },
    getWithdrawalPayloads: async ({
      chainId,
      entrypoint,
      asset,
      amount,
      recipient,
    }: IWithdrawapOperationParams) => {
      const store = getChainStore({ chainId, entrypoint });

      // Get best quote from relayers
      const quoteResultAction = await store.dispatch(
        quoteThunk({
          relayerClient: params.relayerClient,
          relayers: params.relayersList,
          asset,
          amount: amount ?? 0n,
          recipient,
        }),
      );

      if (quoteResultAction.meta.requestStatus === "rejected") {
        throw new Error("Failed to get quote from relayers");
      }

      const { quote, relayerId } = quoteResultAction.payload as QuoteResult;

      // Dispatch the withdraw thunk which handles note selection and proof generation
      const result = await store.dispatch(
        withdrawThunk({
          getNote: store.selectors.getNote,
          getNextNote: store.selectors.getNextNote,
          getExistingNoteSecrets: store.selectors.getExistingNoteSecrets,
        proverFactory: params.proverFactory,
          asset,
          amount: amount ?? 0n,
          recipient,
          relayDataObject: quote.feeCommitment,
        }),
      );

      return [
        {
          payload: result.payload,
          relayData: { quote, relayerId },
        },
      ];
    },
    getRagequitPayloads: function (
      params: IRagequitOperationParams,
    ): Promise<unknown[]> {
      throw new Error("Function not implemented.");
    },
    dumpState: () => getAllStores(),
  };
};
