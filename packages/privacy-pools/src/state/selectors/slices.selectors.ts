import { selectEntityMap } from "../utils/selectors.utils";
import { deserialize } from "../utils/serialize.utils";
import { RootState } from "../store";
import { AspState } from "../slices/aspSlice";
import { UpdateRootEventsState } from "../slices/updateRootEventsSlice";
import { PoolInfoState } from "../slices/poolInfoSlice";

import {
  Address,
  Commitment,
  Label,
  Nullifier,
  Precommitment,
} from "../../interfaces/types.interface";
import {
  IAsset,
  IEntrypointDepositEvent,
  IPool,
  IPoolDepositEvent,
  IRagequitEvent,
  IWithdrawalEvent,
} from "../../data/interfaces/events.interface";
import { createSelector } from "@reduxjs/toolkit";

export const depositsSelector = selectEntityMap(
  (s) => s.deposits.depositsTuples,
  deserialize as () => [Precommitment, IPoolDepositEvent],
);

export const entrypointDepositSelector = selectEntityMap(
  (s) => s.entrypointDeposits.entrypointDepositsTuples,
  deserialize as () => [Commitment, IEntrypointDepositEvent],
);

export const aspSelector = createSelector(
  [(state: RootState) => state.asp],
  (asp) => deserialize(asp) as AspState,
);

export const lastUpdateRootEventSelector = createSelector(
  [(state: RootState) => state.updateRootEvents.lastUpdateRootEvent],
  (lastUpdateRootEvent) => {
    if (!lastUpdateRootEvent) {
      return lastUpdateRootEvent;
    }

    return deserialize(lastUpdateRootEvent, {
      ipfsCID: true,
    }) as UpdateRootEventsState["lastUpdateRootEvent"];
  },
);

export const poolInfoSelector = createSelector(
  [(state: RootState) => state.poolInfo],
  (poolInfo) => deserialize(poolInfo) as PoolInfoState,
);

export const poolsSelector = selectEntityMap(
  (s) => s.pools.poolsTuples,
  deserialize as () => [Address, IPool],
);

export const withdrawalsSelector = selectEntityMap(
  (s) => s.withdrawals.withdrawalsTuples,
  deserialize as () => [Nullifier, IWithdrawalEvent],
);

export const ragequitsSelector = selectEntityMap(
  (s) => s.ragequits.ragequitsTuples,
  deserialize as () => [Label, IRagequitEvent],
);

export const assetSelector = selectEntityMap(
  (s) => s.assets.assetsTuples,
  (assetsTuple) =>
    deserialize(assetsTuple, [undefined, { name: true, symbol: true }]) as [
      Address,
      IAsset,
    ],
);
