import { IStateManager } from "../plugin/interfaces/protocol-params.interface";
import { AssetId } from "../types/base";
import { BaseSelectorParams } from "./interfaces/selectors.interface";
import { storeFactory } from "./store";

const storeByChain = () => {
    const chainStoreMap = new Map<string, ReturnType<typeof storeFactory>>();
    return {
        getChainStore: (chainId: string) => {
            let store = chainStoreMap.get(chainId);
            if (!store) {
                store = storeFactory();
                chainStoreMap.set(chainId, store);
            }
            return store;
        }
    }
}

export const storeStateManager = ({
    entrypointAddress,
}: BaseSelectorParams): IStateManager => {
    const storesByChain = storeByChain();
    return {
    sync: function (): Promise<void> {
        throw new Error("Function not implemented.");
    },
    getDepositCount: function (): Promise<number> {
        throw new Error("Function not implemented.");
    },
    getBalance: function ({
        chainId,
        assetType,
    }: AssetId): string {
        const store = storesByChain.getChainStore('chainId' in chainId ? chainId.chainId.toString() : `${chainId.namespace}-${chainId.reference}`);
        return '';
    }
};
}