import { EthereumProvider } from "@kohaku-eth/provider";
import { GetEventsFn, IDataService } from "./interfaces/data.service.interface";
import { parseEventLogs } from "viem";
import { EVENTS_SIGNATURES, EventTypes } from "./abis/events.abi";
import { EVENTS_PARSERS } from "./utils/events-parsers.util";

export interface DataServiceParams {
    provider: EthereumProvider
}

const depositEvents = new Set(['PoolDeposited', 'EntrypointDeposited']);

export class DataService implements IDataService {
    private readonly provider!: EthereumProvider;

    constructor(params: DataServiceParams) {
        Object.assign(this, params);
    }

    getEvents: GetEventsFn = async ({events = ['EntrypointDeposited', 'PoolDeposited', 'Ragequit', 'Withdrawn'], ...params}) => {
        const logs = await this.provider.getLogs({
            ...params
        });
        const allEvents = events instanceof Array ? events : [events];
        return allEvents.reduce((parsedEvents, eventType) => ({
            ...parsedEvents,
            [eventType]: parseEventLogs({
                logs: logs as never,
                abi: [EVENTS_SIGNATURES[eventType]] as const,
                eventName: (depositEvents.has(eventType) ? 'Deposited' : eventType) as never,
                strict: true
            } as const).map((parsedLog) => EVENTS_PARSERS[eventType](parsedLog as never))
        }), {
            fromBlock: params.fromBlock,
            toBlock: logs.at(-1)?.blockNumber || params.fromBlock,
        } satisfies Pick<Awaited<ReturnType<GetEventsFn>>, 'fromBlock' | 'toBlock'>) as Awaited<ReturnType<GetEventsFn>>;
    }
}
