import { createAsyncThunk } from "@reduxjs/toolkit";
import { IDataService } from "../../data/interfaces/data.service.interface";
import {
  IPoolDepositEvent,
  IWithdrawalEvent,
  IRagequitEvent,
  IPool,
} from "../../data/interfaces/events.interface";
import { selectLastSyncedBlock } from "../selectors/last-synced-block.selector";
import { registerDeposits } from "../slices/depositsSlice";
import { registerRagequits } from "../slices/ragequitsSlice";
import { registerWithdrawals } from "../slices/withdrawalsSlice";
import { RootState } from "../store";
import { poolsSelector } from "../selectors/slices.selectors";

export interface SyncEventsThunkParams {
  dataService: IDataService;
}

export const syncEventsThunk = createAsyncThunk<
  bigint,
  SyncEventsThunkParams,
  { state: RootState; }
>("sync/syncEvents", async ({ dataService }, { getState, dispatch }) => {
  const state = getState();
  const myPools = poolsSelector(state);
  const lastSyncedBlock = selectLastSyncedBlock(state);

  // Fetch deposits, withdrawals, and ragequits from all pools in parallel
  const results = await Promise.allSettled(
    Array.from(myPools.values()).map(async (pool) => {
      const events = await dataService.getPoolEvents({
        events: ["PoolDeposited", "Withdrawn", "Ragequit"],
        fromBlock:
          lastSyncedBlock === 0n ? pool.registeredBlock : lastSyncedBlock + 1n,
        address: pool.address,
      });
      return {
        ...events,
        pool: pool.address,
      };
    }),
  );

  // Collect all events from successful results
  const allDeposits: IPoolDepositEvent[] = [];
  const allWithdrawals: IWithdrawalEvent[] = [];
  const allRagequits: IRagequitEvent[] = [];
  let maxBlock = lastSyncedBlock;

  results.forEach((result) => {
    if (result.status === "fulfilled") {
      const { PoolDeposited, Withdrawn, Ragequit, toBlock, pool } =
        result.value;
      allDeposits.push(...PoolDeposited.map((e) => ({ ...e, pool })));
      allWithdrawals.push(...Withdrawn.map((e) => ({ ...e, pool })));
      allRagequits.push(...Ragequit.map((e) => ({ ...e, pool })));

      if (toBlock > maxBlock) {
        maxBlock = toBlock;
      }
    }
  });

  // Register all fetched events
  if (allDeposits.length > 0) {
    dispatch(registerDeposits(allDeposits));
  }

  if (allWithdrawals.length > 0) {
    dispatch(registerWithdrawals(allWithdrawals));
  }

  if (allRagequits.length > 0) {
    dispatch(registerRagequits(allRagequits));
  }

  // Return the block number from the last event fetched
  return maxBlock;
});
