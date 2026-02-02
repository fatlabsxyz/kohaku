import { Address } from "../../interfaces/types.interface";
import { EventTypes } from "../abis/events.abi";
import { IAsset, IEntrypointDepositEvent, IPoolDepositEvent, IRagequitEvent, IWithdrawalEvent } from "./events.interface";

export interface IGetEventsParams<T extends EventTypes> {
    events?: T | T[];
    fromBlock: number;
    toBlock?: number;
    address: bigint;
}

interface IEventNameToEvent {
    PoolDeposited: IPoolDepositEvent;
    EntrypointDeposited: IEntrypointDepositEvent;
    Withdrawn: IWithdrawalEvent;
    Ragequit: IRagequitEvent;
}

type IGroupedEvents = {
    [key in keyof IEventNameToEvent]: IEventNameToEvent[key][];
};

export type GetEventsFn = <const T extends EventTypes>(params: IGetEventsParams<T>) => Promise<Pick<IGroupedEvents, T> & {
    fromBlock: number;
    toBlock: number;
}>

export interface IPoolConfig {
    poolAddress: Address;
    minimumDepositAmount: bigint;
    vettingFeeBPS: bigint;
    maxRelayFeeBPS: bigint;
}

export interface IDataService {
    getEvents: GetEventsFn;
    getAsset(assetAddress: Address): Promise<IAsset>;
    getPoolAsset(poolAddress: Address): Promise<Address>;
    getPoolForAsset(entrypointAddress: Address, assetAddress: Address): Promise<IPoolConfig>;
    getPoolScope(poolAddress: Address): Promise<bigint>;
}
