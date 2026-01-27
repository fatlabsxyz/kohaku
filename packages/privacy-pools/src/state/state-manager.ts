import { EvmChainId } from "packages/provider/dist";
import { IStateManager } from "../plugin/interfaces/protocol-params.interface";
import { AssetId, ChainId } from "../types/base";
import { BaseSelectorParams } from "./interfaces/selectors.interface";
import { createMyDepositsCountSelector } from "./selectors/deposits.selector";
import { storeFactory } from "./store";
import { syncThunk } from "./thunks/syncThunk";

const storeByChainAndEntrypoint = (params: Omit<BaseSelectorParams, 'dataService'>) => {
    const {
        entrypointAddress,
    } = params;
    const chainStoreMap = new Map<string, ReturnType<typeof storeFactory>>();
    return {
        getChainStore: (chainId: ChainId) => {
            const chainKey = 'chainId' in chainId ? chainId.chainId.toString() : `${chainId.namespace}-${chainId.reference}`;
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
                    depositsCount: (chainId: ChainId) => depositsCountSelector(store.getState(), chainId),
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
        sync: async (chainId: ChainId): Promise<void> => {
            const store = getChainStore(chainId);
            await store.dispatch(syncThunk({ dataService, entrypointAddress: params.entrypointAddress(chainId) }));
        },
        getDepositCount: async (chainId: EvmChainId): Promise<number> => {
            const store = getChainStore(chainId);
            return store.selectors.depositsCount(chainId);
        },
        getBalance: function ({
            chainId,
            assetType,
        }: AssetId): string {
            const store = getChainStore(chainId);
            return '';
        }
    };
}