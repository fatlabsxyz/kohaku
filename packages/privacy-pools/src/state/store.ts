import { Action, configureStore, PayloadAction } from "@reduxjs/toolkit";
import depositsReducer from "./slices/depositsSlice";
import entrypointDepositsReducer from "./slices/entrypointDepositsSlice";
import withdrawalsReducer from "./slices/withdrawalsSlice";
import ragequitsReducer from "./slices/ragequitsSlice";
import assetsReducer from "./slices/assetsSlice";
import poolsReducer from "./slices/poolsSlice";
import poolInfoReducer, {
  PoolInfoState,
  setPoolInfo,
} from "./slices/poolInfoSlice";
import aspReducer from "./slices/aspSlice";
import updateRootEventsReducer from "./slices/updateRootEventsSlice";
import syncReducer from "./slices/syncSlice";
import { createLogger } from "redux-logger";

const logger = createLogger({
  stateTransformer: ({
    deposits: { depositsTuples },
    withdrawals: { withdrawalsTuples },
    ragequits: { ragequitsTuples },
    entrypointDeposits: { entrypointDepositsTuples },
    pools: { poolsTuples },
    asp: { leaves, aspTreeRoot },
    updateRootEvents: { lastUpdateRootEvent },
  }: RootState) => `
  Deposits: ${depositsTuples.length}
  Withdrawals: ${withdrawalsTuples.length}
  Ragequits: ${ragequitsTuples.length}
  EntrypointDeposits: ${entrypointDepositsTuples.length}
  Pools: ${poolsTuples.length}
  Synced ASP root: ${aspTreeRoot}
  Synced ASP leaves count: ${leaves.length}
  Latest known ASP root: ${lastUpdateRootEvent?.root}
  Latest known ASP root ipfs: ${lastUpdateRootEvent?.ipfsCID},
  `,
  actionTransformer: (action: PayloadAction<unknown>) => ({
    action: action.type,
    payload:
      action.payload instanceof Array
        ? { count: action.payload.length }
        : action.payload,
  }),
});

export const storeFactory = (poolInfo: PoolInfoState) => {
  const store = configureStore({
    reducer: {
      deposits: depositsReducer,
      entrypointDeposits: entrypointDepositsReducer,
      withdrawals: withdrawalsReducer,
      ragequits: ragequitsReducer,
      assets: assetsReducer,
      pools: poolsReducer,
      poolInfo: poolInfoReducer,
      asp: aspReducer,
      updateRootEvents: updateRootEventsReducer,
      sync: syncReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoreActions: true,
        },
      }).concat(logger),
  });

  store.dispatch(setPoolInfo(poolInfo));

  return store;
};

type StoreType = ReturnType<typeof storeFactory>;

export type RootState = ReturnType<StoreType["getState"]>;
export type AppDispatch = StoreType["dispatch"];
