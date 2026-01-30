import { Address } from "../interfaces/types.interface";
import { IDepositOperationParams, IGetBalancesOperationParams, IRagequitOperationParams, IStateManager, ISyncOperationParams, IWithdrawapOperationParams, Note } from "../plugin/interfaces/protocol-params.interface";
import { BaseSelectorParams } from "./interfaces/selectors.interface";
import { createMyUnsyncedAssetsSelector } from "./selectors/assets.selector";
import { createMyAssetsBalanceSelector, createMyDepositsBalanceSelector } from "./selectors/balance.selector";
import { createMyDepositsCountSelector, createMyDepositsSelector, createMyDepositsWithAssetSelector, createMyEntrypointDepositsSelector } from "./selectors/deposits.selector";
import { createMyPoolsSelector, createMyUnsyncedPoolsAddresses } from "./selectors/pools.selector";
import { createMyRagequitsSelector } from "./selectors/ragequits.selector";
import { createMyWithdrawalsSelector } from "./selectors/withdrawals.selector";
import { storeFactory } from "./store";
import { syncThunk } from "./thunks/syncThunk";
import { AssetId, Eip155ChainId } from "@kohaku-eth/plugins";

export type StoreFactoryParams = BaseSelectorParams;

const storeByChainAndEntrypoint = (params: Omit<StoreFactoryParams, 'dataService'>) => {
    const chainStoreMap = new Map<string, ReturnType<typeof storeFactory>>();
    return {
        getChainStore: ({ chainId, entrypoint }:{chainId: Eip155ChainId<number>; entrypoint: Address}) => {
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
            const myWithdrawalsSelector = createMyWithdrawalsSelector({myDepositsSelector, ...params});

            const myPoolsSelector = createMyPoolsSelector(myEntrypointDepositsSelector);
            const myUnsyncedPoolsSelector = createMyUnsyncedPoolsAddresses(myEntrypointDepositsSelector);
            const myUnsyncedAssetsSelector = createMyUnsyncedAssetsSelector(myPoolsSelector);
            const myDepositsBalanceSelector = createMyDepositsBalanceSelector({
                myDepositsWithAssetSelector,
                myRagequitsSelector,
                myWithdrawalsSelector
            });
            const myAssetsBalanceSelector = createMyAssetsBalanceSelector({myDepositsBalanceSelector});

            return {
                ...store,
                selectors: {
                    depositsCount: () => depositsCountSelector(store.getState()),
                    myUnsyncedAssetsSelector: () => myUnsyncedAssetsSelector(store.getState()),
                    myUnsyncedPoolsSelector: () => myUnsyncedPoolsSelector(store.getState()),
                    myAssetsBalanceSelector: () => myAssetsBalanceSelector(store.getState()),
                }
            };
        }
    }
}

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
        getDepositPayload: (params: IDepositOperationParams): Promise<unknown> => {
            throw new Error("Function not implemented.");
        },
        getWithdrawalPayloads: function (params: IWithdrawapOperationParams): Promise<unknown[]> {
            throw new Error("Function not implemented.");
        },
        getRagequitPayloads: function (params: IRagequitOperationParams): Promise<unknown[]> {
            throw new Error("Function not implemented.");
        },
    };
}