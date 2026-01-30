import type { EthProvider } from "@kohaku-eth/plugins";
import { ContractFunctionName, decodeFunctionResult, DecodeFunctionResultReturnType, encodeFunctionData, EncodeFunctionDataParameters, erc20Abi, type RpcLog, toHex } from 'viem';
import { entrypointAbi, poolAbi } from "./abis/events.abi";
import { Address } from "../interfaces/types.interface";

export interface GetLogsParams {
    address: string;
    fromBlock: number;
    toBlock?: number;
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

    async getLogs(params: GetLogsParams): Promise<RpcLog[]> {
        const filter: Record<string, string> = {
            address: params.address,
            fromBlock: toHex(params.fromBlock),
        };

        if (params.toBlock !== undefined) {
            filter['toBlock'] = toHex(params.toBlock);
        }

        return this.provider.request({
            method: "eth_getLogs",
            params: [filter],
        }) as Promise<RpcLog[]>;
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
