import { ParseAbiItem } from "viem";
import { Address } from "../../interfaces/types.interface";
import { IAsset, IEntrypointDepositEvent, IPoolDepositEvent, IPoolRegisteredEvent, IPoolWindDownEvent, IRagequitEvent, IRawPoolDepositEvent, IRawRagequitEvent, IRawWithdrawalEvent, IRootUpdatedEvent, IWithdrawalEvent } from "./events.interface";
import { ENTRYPOINT_EVENTS_SIGNATURES, POOL_EVENTS_SIGNATURES } from "../abis/events.abi";

type IEventsMap = Record<string, ParseAbiItem<any>>;

export interface IGetEventsParams<T> {
    events: T | T[];
    fromBlock: bigint;
    toBlock?: bigint;
    address: bigint;
}

export interface IEntrypointEvents {
    EntrypointDeposited: IEntrypointDepositEvent;
    RootUpdated: IRootUpdatedEvent;
    PoolRegistered: IPoolRegisteredEvent;
    PoolWindDown: IPoolWindDownEvent;
}

export interface IPoolEvents {
    PoolDeposited: IRawPoolDepositEvent;
    Withdrawn: IRawWithdrawalEvent;
    Ragequit: IRawRagequitEvent;
}

type IGroupedEvents<NamesTable extends Record<string, any>> = {
    [key in keyof NamesTable]: NamesTable[key][];
};

export type GetEventsFn<
    EventsMap extends IEventsMap,
    ParsedEvents extends {[key in keyof EventsMap]: any}
> = <const T extends keyof ParsedEvents = never>(params: IGetEventsParams<T>) => Promise<Pick<IGroupedEvents<ParsedEvents>, T> & {
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
    getPoolEvents: GetEventsFn<typeof POOL_EVENTS_SIGNATURES, IPoolEvents>;
    getEntrypointEvents: GetEventsFn<typeof ENTRYPOINT_EVENTS_SIGNATURES, IEntrypointEvents>;
    getAsset(assetAddress: Address): Promise<IAsset>;
    getPoolAsset(poolAddress: Address): Promise<Address>;
    getPoolForAsset(entrypointAddress: Address, assetAddress: Address): Promise<IPoolConfig>;
    getPoolScope(poolAddress: Address): Promise<bigint>;
}
