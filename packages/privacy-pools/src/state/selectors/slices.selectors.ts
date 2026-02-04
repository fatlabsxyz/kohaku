import { selectEntityMap } from "../utils/selectors.utils";
import { deserialize, serialize } from "../utils/serialize.utils";
import { RootState } from "../store";
import { Deserialize } from "../interfaces/utils.interface";
import { DepositsState } from "../slices/depositsSlice";
import { EntrypointDepositsState } from "../slices/entrypointDepositsSlice";
import { AspState } from "../slices/aspSlice";
import { UpdateRootEventsState } from "../slices/updateRootEventsSlice";
import { PoolInfoState } from "../slices/poolInfoSlice";
import { PoolsState } from "../slices/poolsSlice";
import { WithdrawalsState } from "../slices/withdrawalsSlice";
import { RagequitsState } from "../slices/ragequitsSlice";
import { Address } from "../../interfaces/types.interface";
import { IAsset } from "../../data/interfaces/events.interface";

const deserializeTuple = <Key, Value>(
  tuples: [Key, Value][],
): [Deserialize<Key>, Deserialize<Value>][] =>
  tuples.map(([key, value]) => [deserialize(key), deserialize(value)]);

export const depositsSelector = selectEntityMap(
  (s) =>
    deserializeTuple(
      s.deposits.depositsTuples,
    ) as DepositsState["depositsTuples"],
);
export const entrypointDepositSelector = selectEntityMap(
  (s) =>
    deserializeTuple(
      s.entrypointDeposits.entrypointDepositsTuples,
    ) as EntrypointDepositsState["entrypointDepositsTuples"],
);
export const aspSelector = (state: RootState) =>
  deserialize(state.asp) as AspState;
export const lastUpdateRootEventSelector = ({
  updateRootEvents: { lastUpdateRootEvent },
}: RootState) => {
  if (!lastUpdateRootEvent) {
    return lastUpdateRootEvent;
  }
  const { ipfsCID, ...rest } = lastUpdateRootEvent;
  return {
    ...deserialize(rest),
    ipfsCID,
  } as UpdateRootEventsState["lastUpdateRootEvent"];
};
export const poolInfoSelector = (state: RootState) =>
  deserialize(state.poolInfo) as PoolInfoState;
export const poolsSelector = selectEntityMap(
  (s) => deserializeTuple(s.pools.poolsTuples) as PoolsState["poolsTuples"],
);
export const withdrawalsSelector = selectEntityMap(
  (s) =>
    deserializeTuple(
      s.withdrawals.withdrawalsTuples,
    ) as WithdrawalsState["withdrawalsTuples"],
);
export const ragequitsSelector = selectEntityMap(
  (s) =>
    deserializeTuple(
      s.ragequits.ragequitsTuples,
    ) as RagequitsState["ragequitsTuples"],
);
export const assetSelector = selectEntityMap(({ assets: { assetsTuples } }) =>
  assetsTuples.map(([_, { address: stringAddress, ...asset }]) => {
    const address = deserialize(stringAddress) as Address;
    return [address, { address, ...asset } as IAsset];
  }),
);
