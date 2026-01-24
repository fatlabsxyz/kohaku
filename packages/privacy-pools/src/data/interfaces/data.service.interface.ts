import { EventTypes } from "../abis/events.abi";
import { IPoolDepositEvent, IRagequitEvent, IWithdrawalEvent } from "./events.interface";

export interface IGetEventsParams<T extends EventTypes> {
    events: T | T[];
    fromBlock: number;
    toBlock?: number;
    address: string;
}

interface IEventNameToEvent {
    Deposited: IPoolDepositEvent;
    Withdrawn: IWithdrawalEvent;
    Ragequit: IRagequitEvent;
}

type IGroupedEvents = {
    [key in keyof IEventNameToEvent]: IEventNameToEvent[key][];
};

export type GetEventsFn = <const T extends EventTypes>(params: IGetEventsParams<T>) => Promise<Pick<IGroupedEvents, T>>

export interface IDataService {
    getEvents: GetEventsFn;
}
