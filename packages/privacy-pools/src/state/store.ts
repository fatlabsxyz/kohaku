import {
  combineReducers,
  configureStore,
  Middleware,
  PayloadAction,
  ReducersMapObject,
  Store,
} from "@reduxjs/toolkit";
import depositsReducer from "./slices/depositsSlice";
import entrypointDepositsReducer from "./slices/entrypointDepositsSlice";
import withdrawalsReducer from "./slices/withdrawalsSlice";
import ragequitsReducer from "./slices/ragequitsSlice";
import assetsReducer from "./slices/assetsSlice";
import poolsReducer from "./slices/poolsSlice";
import poolInfoReducer, {
  EntrypointInfoState,
  setEntrypointInfo,
} from "./slices/entrypointInfoSlice";
import aspReducer from "./slices/aspSlice";
import updateRootEventsReducer from "./slices/updateRootEventsSlice";
import poolsLeavesReducer from "./slices/poolLeavesSlice";
import syncReducer from "./slices/syncSlice";

const reducers = {
  deposits: depositsReducer,
  entrypointDeposits: entrypointDepositsReducer,
  withdrawals: withdrawalsReducer,
  ragequits: ragequitsReducer,
  assets: assetsReducer,
  pools: poolsReducer,
  poolsLeaves: poolsLeavesReducer,
  entrypointInfo: poolInfoReducer,
  asp: aspReducer,
  updateRootEvents: updateRootEventsReducer,
  sync: syncReducer,
} as const;

export type RootState = ReturnType<ReturnType<typeof combineReducers<typeof reducers>>>;

const logger: Middleware<object, RootState> = (api) => (next) => (action) => {
  const result = next(action);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const error = (action as any).error;

  const { type, payload } = action as PayloadAction<unknown>;
  const transformedAction = {
    action: type,
    payload: error || (payload instanceof Array ? { count: payload.length } : payload),
  };

  const {
    deposits: { depositsTuples },
    withdrawals: { withdrawalsTuples },
    ragequits: { ragequitsTuples },
    entrypointDeposits: { entrypointDepositsTuples },
    pools: { poolsTuples },
    asp: { leaves, aspTreeRoot },
    updateRootEvents: { lastUpdateRootEvent },
  } = api.getState();

  const transformedState = `
  Deposits: ${depositsTuples.length}
  Withdrawals: ${withdrawalsTuples.length}
  Ragequits: ${ragequitsTuples.length}
  EntrypointDeposits: ${entrypointDepositsTuples.length}
  Pools: ${poolsTuples.length}
  Synced ASP root: ${aspTreeRoot}
  Synced ASP leaves count: ${leaves.length}
  Latest known ASP root: ${lastUpdateRootEvent?.root}
  Latest known ASP root ipfs: ${lastUpdateRootEvent?.ipfsCID},
  `;

  console.group(`action ${type}`);
  console.log("%c action", "color: #9E9E9E", transformedAction);
  console.log("%c next state", "color: #4CAF50", transformedState);
  console.groupEnd();

  return result;
};

type StoreShape = typeof reducers extends ReducersMapObject<infer StateType> ? StateType : never;

interface StoreFactoryParams {
  entrypointInfo: EntrypointInfoState;
  initialState?: StoreShape;
}

export const storeFactory = ({
  entrypointInfo,
  initialState,
}: StoreFactoryParams) => {
  const store = configureStore({
    preloadedState: initialState,
    reducer: reducers,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoreActions: true,
        },
      }).concat(logger),
  });

  store.dispatch(setEntrypointInfo(entrypointInfo));

  return store;
};

export type AppDispatch = ReturnType<typeof storeFactory>["dispatch"];
