import { configureStore } from '@reduxjs/toolkit';
import depositsReducer from './slices/depositsSlice';
import entrypointDepositsReducer from './slices/entrypointDepositsSlice';
import withdrawalsReducer from './slices/withdrawalsSlice';
import ragequitsReducer from './slices/ragequitsSlice';
import assetsReducer from './slices/assetsSlice';
import poolsReducer from './slices/poolsSlice';
import poolInfoReducer, { PoolInfoState, setPoolInfo } from './slices/poolInfoSlice';

export const storeFactory = (poolInfo: PoolInfoState) => {
  const store = configureStore({
    reducer: {
      deposits: depositsReducer,
      entrypointDeposits: entrypointDepositsReducer,
      withdrawals: withdrawalsReducer,
      ragequits: ragequitsReducer,
      assets: assetsReducer,
      pools: poolsReducer,
      poolInfo: poolInfoReducer
    },
  });
  store.dispatch(setPoolInfo(poolInfo));
  return store;
}

type StoreType = ReturnType<typeof storeFactory>;

export type RootState = ReturnType<StoreType['getState']>;
export type AppDispatch = StoreType['dispatch'];
