import { IStateManager, Note } from "../plugin/interfaces/protocol-params.interface";
import { BaseSelectorParams } from "./interfaces/selectors.interface";
import { createMyUnsyncedAssetsSelector } from "./selectors/assets.selector";
import { createMyDepositsCountSelector } from "./selectors/deposits.selector";
import { createMyUnsyncedPoolsAddresses } from "./selectors/pools.selector";
import { storeFactory } from "./store";
import { syncThunk } from "./thunks/syncThunk";
import { AssetId, Eip155ChainId } from "@kohaku-eth/plugins";

const storeByChainAndEntrypoint = (params: Omit<BaseSelectorParams, 'dataService'>) => {
    const {
        entrypointAddress,
    } = params;
    const chainStoreMap = new Map<string, ReturnType<typeof storeFactory>>();
    return {
        getChainStore: (chainId: Eip155ChainId) => {
            const chainKey = chainId.toString();
            const computedChainKey = `${chainKey}-${entrypointAddress(chainId)}}`;
            let store = chainStoreMap.get(computedChainKey);
            if (!store) {
                store = storeFactory();
                chainStoreMap.set(computedChainKey, store);
            }
            // We need to tie the selectors instances to a specific store
            // so they can memoize correctly
            const depositsCountSelector = createMyDepositsCountSelector(params);
            const myUnsyncedAssetsSelector = createMyUnsyncedAssetsSelector(params);
            const myUnsyncedPoolsSelector = createMyUnsyncedPoolsAddresses(params);
            return {
                ...store,
                selectors: {
                    depositsCount: () => depositsCountSelector(store.getState(), chainId),
                    myUnsyncedAssetsSelector: () => myUnsyncedAssetsSelector(store.getState(), chainId),
                    myUnsyncedPoolsSelector: () => myUnsyncedPoolsSelector(store.getState(), chainId),
                }
            };
        }
    }
}

export const storeStateManager = ({
    dataService,
    ...params
}: BaseSelectorParams): IStateManager => {
    const { getChainStore } = storeByChainAndEntrypoint(params);
    return {
        sync: async (chainId): Promise<void> => {
            const store = getChainStore(chainId);
            await store.dispatch(syncThunk({
                dataService,
                entrypointAddress: params.entrypointAddress(chainId),
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