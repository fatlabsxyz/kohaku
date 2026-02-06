import { EthProvider } from "@kohaku-eth/plugins";
import { GetEventsFn, IDataService, IEntrypointEvents, IPoolConfig, IPoolEvents } from "./interfaces/data.service.interface";
import { parseEventLogs, pad, toHex } from "viem";
import { ENTRYPOINT_EVENTS_SIGNATURES, EVENTS_SIGNATURES, POOL_EVENTS_SIGNATURES } from "./abis/events.abi";
import { EVENTS_PARSERS } from "./utils/events-parsers.util";
import { EthClient } from "./eth-client";
import type { IAsset } from "./interfaces/events.interface";
import { Address } from "../interfaces/types.interface";
import { E_ADDRESS } from "../config";

export interface DataServiceParams {
    provider: EthProvider
}

const depositEvents = new Set(['PoolDeposited', 'EntrypointDeposited']);

type GenericGetEvents = GetEventsFn<typeof EVENTS_SIGNATURES, IPoolEvents & IEntrypointEvents>;

export class DataService implements IDataService {
    private readonly ethClient!: EthClient;

    constructor({ provider }: DataServiceParams) {
        this.ethClient = new EthClient(provider);
    }

    private getEvents: GenericGetEvents = async ({
        events,
        address,
        fromBlock,
        toBlock,
    }) => {
        const logs = await this.ethClient.getLogs({
            address: pad(toHex(address), { size: 20 }),
            fromBlock: Number(fromBlock),
            ...(toBlock ? { toBlock: Number(toBlock) } : {})
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
            fromBlock: fromBlock,
            toBlock: BigInt(logs.at(-1)?.blockNumber || 0n) || fromBlock,
        } satisfies Pick<Awaited<ReturnType<GenericGetEvents>>, 'fromBlock' | 'toBlock'>) as Awaited<ReturnType<GenericGetEvents>>;
    }

    getPoolEvents: GetEventsFn<typeof POOL_EVENTS_SIGNATURES, IPoolEvents> = this.getEvents;
    getEntrypointEvents: GetEventsFn<typeof ENTRYPOINT_EVENTS_SIGNATURES, IEntrypointEvents> = this.getEvents;

    async getAsset(address: Address): Promise<IAsset> {
        if (address === BigInt(E_ADDRESS)) {
            return {
                name: 'ETH',
                address,
                decimals: 18,
                symbol: 'ETH',
            };
        }
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
