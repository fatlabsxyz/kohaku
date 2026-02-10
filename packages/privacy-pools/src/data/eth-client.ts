import type { EthProvider } from "@kohaku-eth/plugins";
import { ContractFunctionName, decodeFunctionResult, DecodeFunctionResultReturnType, encodeFunctionData, EncodeFunctionDataParameters, erc20Abi, toHex, type RpcLog } from 'viem';
import { Address } from "../interfaces/types.interface";
import { entrypointAbi } from "./abis/entrypoint.abi";
import { poolAbi } from "./abis/pool.abi";

export interface GetLogsParams {
    address: string;
    fromBlock: number;
    toBlock?: number;
    maxQuerySize?: number;
}

const abis = {
    erc20: erc20Abi,
    pool: poolAbi,
    entrypoint: entrypointAbi,
} as const;

export class EthClient {
    private readonly provider: EthProvider;

    constructor(provider: EthProvider) {
        this.provider = provider;
    }

    request: EthProvider['request'] = (...params): Promise<unknown> => {
        return this.provider.request(...params);
    }

    async getLogs({
        maxQuerySize = 5000,
        ...params
    }: GetLogsParams): Promise<RpcLog[]> {
        const fromBlock = params.fromBlock;
        const toBlock = params.toBlock ?? await this.getBlockNumber();

        const logs: RpcLog[] = [];
        for (let start = fromBlock; start <= toBlock; start += maxQuerySize + 1) {
            const end = Math.min(start + maxQuerySize, toBlock);
            const result = await this.provider.request({
                method: "eth_getLogs",
                params: [{
                    address: params.address,
                    fromBlock: toHex(start),
                    toBlock: toHex(end),
                }],
            }) as RpcLog[];
            logs.push(...result);
        }

        return logs;
    }

    async getCode(address: string, blockNumber?: number): Promise<string> {
        const block = blockNumber !== undefined ? toHex(blockNumber) : 'latest';
        return this.provider.request({
            method: 'eth_getCode',
            params: [address, block],
        }) as Promise<string>;
    }

    async getBlockNumber(): Promise<number> {
        const hex = await this.provider.request({
            method: "eth_blockNumber",
            params: [],
        }) as string;
        return parseInt(hex, 16);
    }

    async makeContractRequest<
        Contract extends keyof typeof abis,
        Abi extends typeof abis[Contract],
        FunctionName extends ContractFunctionName<Abi>,
        Args extends EncodeFunctionDataParameters<Abi, FunctionName>['args'],
        ArgsArray extends Args extends undefined ? [] : Args extends ReadonlyArray<any> ? Args : []
    >(
        contractAddress: Address,
        contractName: Contract,
        functionName: FunctionName,
        ...args: ArgsArray
    ): Promise<DecodeFunctionResultReturnType<Abi, FunctionName, any>> {
        const abi = abis[contractName];
        const data = encodeFunctionData({
            abi,
            functionName,
            args,
        } as never);

        const result = await this.request({
            method: 'eth_call',
            params: [{
                to: toHex(contractAddress),
                data
            }, 'latest'],
        });

        return decodeFunctionResult({
            abi,
            functionName,
            data: result,
        } as never) as never;
    }
}
