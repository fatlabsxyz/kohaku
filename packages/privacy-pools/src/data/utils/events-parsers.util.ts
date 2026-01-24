import { ContractEventName, Hash, Log, ParseEventLogsReturnType } from "viem";
import { EVENTS_SIGNATURES } from "../abis/events.abi";
import { IEntrypointDepositEvent, IPoolDepositEvent, IRagequitEvent, IWithdrawalEvent } from "../interfaces/events.interface";

interface EventsParsersResultsByKey {
  PoolDeposited: IPoolDepositEvent;
  Withdrawn: IWithdrawalEvent;
  Ragequit: IRagequitEvent;
  EntrypointDeposited: IEntrypointDepositEvent;
}

export const EVENTS_PARSERS: {
  [key in keyof typeof EVENTS_SIGNATURES]:
    (args: ParseEventLogsReturnType<
      [typeof EVENTS_SIGNATURES[key]],
      ContractEventName<[typeof EVENTS_SIGNATURES[key]]>,
      true
    >[number]) => EventsParsersResultsByKey[key];
} = {
    PoolDeposited: (log) => {
        const {
            _depositor: depositor, _commitment: commitment, _label: label, _value: value, _merkleRoot: precommitment,
        } = log.args;

        return {
            depositor: BigInt(depositor),
            commitment,
            label,
            value: value || BigInt(0),
            precommitment,
            blockNumber: log.blockNumber,
            transactionHash: BigInt(log.transactionHash),
        };
    },
    Withdrawn: (log) => {
        const {
            _value: value, _spentNullifier: spentNullifier, _newCommitment: newCommitment,
        } = log.args;

        return {
            value,
            spentNullifier: spentNullifier,
            newCommitment: newCommitment,
            blockNumber: log.blockNumber,
            transactionHash: BigInt(log.transactionHash),
        };
    },
    Ragequit: ({
        blockNumber, transactionHash, args
    }) => {
        const {
            _ragequitter: ragequitter, _commitment: commitment, _label: label, _value: value,
        } = args;

        return {
            ragequitter: BigInt(ragequitter),
            commitment: commitment,
            label,
            value: value || BigInt(0),
            blockNumber: blockNumber,
            transactionHash: BigInt(transactionHash),
        };

    },
    EntrypointDeposited: ({
        blockNumber,
        transactionHash,
        args: {
            _pool: poolAddress,
            _amount: value,
            _depositor: depositor,
            _commitment: commitment,
        }
    }) => {
        return {
            blockNumber,
            transactionHash: BigInt(transactionHash),
            depositor: BigInt(depositor),
            poolAddress: BigInt(poolAddress),
            commitment,
            value,
        }
    }
}