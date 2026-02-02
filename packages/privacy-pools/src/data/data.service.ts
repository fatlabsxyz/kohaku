import { EthProvider } from "@kohaku-eth/plugins";
import { GetEventsFn, IDataService, IPoolConfig } from "./interfaces/data.service.interface";
import { parseEventLogs, pad, toHex } from "viem";
import { EVENTS_SIGNATURES } from "./abis/events.abi";
import { EVENTS_PARSERS } from "./utils/events-parsers.util";
import { EthClient } from "./eth-client";
import type { IAsset } from "./interfaces/events.interface";
import { Address } from "../interfaces/types.interface";

export interface DataServiceParams {
    provider: EthProvider
}

const depositEvents = new Set(['PoolDeposited', 'EntrypointDeposited']);

export class DataService implements IDataService {
    private readonly ethClient!: EthClient;

    constructor({ provider }: DataServiceParams) {
        this.ethClient = new EthClient(provider);
    }

    getEvents: GetEventsFn = async ({
        events = ['EntrypointDeposited', 'PoolDeposited', 'Ragequit', 'Withdrawn', 'RootUpdated'],
        address,
        ...params
    }) => {
        const logs = await this.ethClient.getLogs({
            address: pad(toHex(address), { size: 20 }),
            ...params
        });
        const allEvents = events instanceof Array ? events : [events];
        return allEvents.reduce((parsedEvents, eventType) => ({
            ...parsedEvents,
            [eventType]: parseEventLogs({
                logs,
                abi: [EVENTS_SIGNATURES[eventType]] as const,
                eventName: (depositEvents.has(eventType) ? 'Deposited' : eventType) as never,
                strict: true
            } as const).map((parsedLog) => EVENTS_PARSERS[eventType](parsedLog as never))
        }), {
            fromBlock: params.fromBlock,
            toBlock: Number(logs.at(-1)?.blockNumber) || params.fromBlock,
        } satisfies Pick<Awaited<ReturnType<GetEventsFn>>, 'fromBlock' | 'toBlock'>) as Awaited<ReturnType<GetEventsFn>>;
    }

    async getAsset(address: Address): Promise<IAsset> {
        const [name, decimals, symbol] = await Promise.all([
            this.ethClient.makeContractRequest(address, 'erc20', 'name'),
            this.ethClient.makeContractRequest(address, 'erc20', 'decimals'),
            this.ethClient.makeContractRequest(address, 'erc20', 'symbol'),
        ]);
        return { name, decimals, symbol, address };
    }

    async getPoolAsset(poolAddress: Address) {
        return BigInt(await this.ethClient.makeContractRequest(poolAddress, 'pool', 'ASSET'));
    }

    async getPoolForAsset(entrypointAddress: Address, assetAddress: Address): Promise<IPoolConfig> {
        const [
            poolAddress,
            minimumDepositAmount,
            vettingFeeBPS,
            maxRelayFeeBPS
        ] = await this.ethClient.makeContractRequest(
            entrypointAddress,
            'entrypoint',
            'assetConfig',
            toHex(assetAddress)
        );

        return {
            poolAddress: BigInt(poolAddress),
            minimumDepositAmount,
            vettingFeeBPS,
            maxRelayFeeBPS,
        };
    }

    async getPoolScope(poolAddress: Address) {
        return this.ethClient.makeContractRequest(poolAddress, 'pool', 'SCOPE');
    }
}
