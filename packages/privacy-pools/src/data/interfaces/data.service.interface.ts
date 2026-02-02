import { Address } from "../../interfaces/types.interface";
import { EventTypes } from "../abis/events.abi";
import { IAsset, IEntrypointDepositEvent, IPoolDepositEvent, IRagequitEvent, IRootUpdatedEvent, IWithdrawalEvent } from "./events.interface";

export interface IGetEventsParams<T extends EventTypes> {
    events: T | T[];
    fromBlock: bigint;
    toBlock?: bigint;
    address: bigint;
}

interface IEventNameToEvent {
    PoolDeposited: IPoolDepositEvent;
    EntrypointDeposited: IEntrypointDepositEvent;
    Withdrawn: IWithdrawalEvent;
    Ragequit: IRagequitEvent;
    RootUpdated: IRootUpdatedEvent;
}

type IGroupedEvents = {
    [key in keyof IEventNameToEvent]: IEventNameToEvent[key][];
};

export type GetEventsFn = <const T extends EventTypes = never>(params: IGetEventsParams<T>) => Promise<Pick<IGroupedEvents, T> & {
    fromBlock: bigint;
    toBlock: bigint;
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
