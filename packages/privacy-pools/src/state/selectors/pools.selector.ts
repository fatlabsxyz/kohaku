import { createSelector } from "@reduxjs/toolkit";
import { IPool, IPoolDepositEvent, IRagequitEvent, IWithdrawalEvent } from "../../data/interfaces/events.interface";
import { RootState } from "../store";
import { createMyEntrypointDepositsSelector, depositsSelector } from "./deposits.selector";
import { selectEntityMap } from "../utils/selectors.utils";
import { withdrawalsSelector } from "./withdrawals.selector";
import { ragequitsSelector } from "./ragequits.selector";
import { Address, Commitment, Nullifier, Precommitment } from "../../interfaces/types.interface";

export const poolsSelector = selectEntityMap((s) => s.pools.poolsTuples);

export const createMyPoolsSelector = (
  myEntrypointDepositsSelector: ReturnType<typeof createMyEntrypointDepositsSelector>
) => {
  return createSelector(
    [
      myEntrypointDepositsSelector,
      poolsSelector,
    ],
    (myEntrypointDeposits, pools): IPool[] => {
      return Array.from(new Set(
        Array.from(myEntrypointDeposits.values())
          .map(({ poolAddress }) => poolAddress)
      ))
        .map((poolAddress) => pools.get(poolAddress))
        .filter((pool) => !!pool);
    }
  );
};

export const poolEventsSelector = createSelector(
  [
    depositsSelector,
    withdrawalsSelector,
    ragequitsSelector,
    (state: RootState, poolAddress: Address) => poolAddress,
  ],
  (deposits, withdrawals, ragequits, poolAddress) => {
    // Filter deposits by pool address
    const filteredDeposits = new Map(
      Array.from(deposits)
        .filter(([_, deposit]) => deposit.pool === poolAddress)
    );

    // Filter withdrawals by pool address
    const filteredWithdrawals = new Map(
      Array.from(withdrawals)
        .filter(([_, withdrawal]) => withdrawal.pool === poolAddress)
    );

    // Filter ragequits by pool address
    const filteredRagequits = new Map(
      Array.from(ragequits)
        .filter(([_, ragequit]) => ragequit.pool === poolAddress)
    );

    return {
      deposits: filteredDeposits,
      withdrawals: filteredWithdrawals,
      ragequits: filteredRagequits,
    };
  }
);

export const poolCommitmentsSelector = createSelector(
  [poolEventsSelector],
  (poolEvents): Set<Commitment> => {
    const { deposits, withdrawals } = poolEvents;

    const depositsArray = Array.from(deposits.values());
    const withdrawalsArray = Array.from(withdrawals.values());
    const combined = [...depositsArray, ...withdrawalsArray];

    const eventsSorterByBlockNumber = combined.sort((a, b) => {
      return Number(a.blockNumber - b.blockNumber);
    });

    return new Set(
      eventsSorterByBlockNumber.map(({commitment}) => commitment)
    );
  }
);
