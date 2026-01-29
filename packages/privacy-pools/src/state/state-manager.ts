import { IStateManager, Note } from "../plugin/interfaces/protocol-params.interface";
import { BaseSelectorParams } from "./interfaces/selectors.interface";
import { createMyUnsyncedAssetsSelector } from "./selectors/assets.selector";
import { createMyDepositsCountSelector, createMyDepositsSelector, createMyEntrypointDepositsSelector } from "./selectors/deposits.selector";
import { createMyPoolsSelector, createMyUnsyncedPoolsAddresses } from "./selectors/pools.selector";
import { storeFactory } from "./store";
import { syncThunk } from "./thunks/syncThunk";
import { AssetId, Eip155ChainId } from "@kohaku-eth/plugins";

export interface StoreFactoryParams extends BaseSelectorParams {
    entrypointAddress: (chainId: Eip155ChainId) => bigint;
}

const storeByChainAndEntrypoint = (params: Omit<StoreFactoryParams, 'dataService'>) => {
    const {
        entrypointAddress,
    } = params;
    const chainStoreMap = new Map<string, ReturnType<typeof storeFactory>>();
    return {
        getChainStore: (chainId: Eip155ChainId) => {
            const chainKey = chainId.toString();
            const entrypoint = entrypointAddress(chainId);
            const computedChainKey = `${chainKey}-${entrypoint}`;
            let store = chainStoreMap.get(computedChainKey);
            if (!store) {
                store = storeFactory({
                    chainId: BigInt(chainId.reference),
                    entrypointAddress: BigInt(entrypoint),
                });
                chainStoreMap.set(computedChainKey, store);
            }
            // We need to tie the selectors instances to a specific store
            // so they can memoize correctly
            const myDepositsSelector = createMyDepositsSelector(params);
            const depositsCountSelector = createMyDepositsCountSelector(myDepositsSelector);
            const myEntrypointDepositsSelector = createMyEntrypointDepositsSelector(myDepositsSelector);
            const myPoolsSelector = createMyPoolsSelector(myEntrypointDepositsSelector);
            const myUnsyncedAssetsSelector = createMyUnsyncedAssetsSelector(myPoolsSelector);
            const myUnsyncedPoolsSelector = createMyUnsyncedPoolsAddresses(myEntrypointDepositsSelector);

            return {
                ...store,
                selectors: {
                    depositsCount: () => depositsCountSelector(store.getState()),
                    myUnsyncedAssetsSelector: () => myUnsyncedAssetsSelector(store.getState()),
                    myUnsyncedPoolsSelector: () => myUnsyncedPoolsSelector(store.getState()),
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
        sync: async (chainId): Promise<void> => {
            const store = getChainStore(chainId);
            await store.dispatch(syncThunk({
                dataService,
                ...store.selectors
            }));
        },
        getDepositCount: async (chainId): Promise<number> => {
            const store = getChainStore(chainId);
            return store.selectors.depositsCount();
        },
        getBalance: function ({
            chainId,
        }): string {
            const store = getChainStore(chainId as Eip155ChainId);
            
            return '';
        },
        getNote: function (asset: AssetId, amount: bigint): Note | undefined {
            throw new Error("Function not implemented.");
        },
    };
}