import { IStateManager, Note } from "../plugin/interfaces/protocol-params.interface";
import { EvmChainId } from "../types/base";
import { BaseSelectorParams } from "./interfaces/selectors.interface";
import { createMyDepositsCountSelector } from "./selectors/deposits.selector";
import { storeFactory } from "./store";
import { syncThunk } from "./thunks/syncThunk";
import { AssetId } from "@kohaku-eth/plugins";

const storeByChainAndEntrypoint = (params: Omit<BaseSelectorParams, 'dataService'>) => {
    const {
        entrypointAddress,
    } = params;
    const chainStoreMap = new Map<string, ReturnType<typeof storeFactory>>();
    return {
        getChainStore: (chainId: EvmChainId) => {
            const chainKey = chainId.chainId.toString();
            const computedChainKey = `${chainKey}-${entrypointAddress(chainId)}}`;
            let store = chainStoreMap.get(computedChainKey);
            if (!store) {
                store = storeFactory();
                chainStoreMap.set(computedChainKey, store);
            }
            // We need to tie the selectors instances to a specific store
            // so they can memoize correctly
            const depositsCountSelector = createMyDepositsCountSelector(params);
            return {
                ...store,
                selectors: {
                    depositsCount: (chainId: EvmChainId) => depositsCountSelector(store.getState(), chainId),
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
            await store.dispatch(syncThunk({ dataService, entrypointAddress: params.entrypointAddress(chainId) }));
        },
        getDepositCount: async (chainId): Promise<number> => {
            const store = getChainStore(chainId);
            return store.selectors.depositsCount(chainId);
        },
        getBalance: function ({
            chainId, assetType,
        }): string {
            const store = getChainStore(chainId);
            return '';
        },
        getNote: function (asset: AssetId, amount: bigint): Note | undefined {
            throw new Error("Function not implemented.");
        },
    };
}