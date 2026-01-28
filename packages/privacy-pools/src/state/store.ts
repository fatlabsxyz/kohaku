import { configureStore } from '@reduxjs/toolkit';
import depositsReducer from './slices/depositsSlice';
import entrypointDepositsReducer from './slices/entrypointDepositsSlice';
import withdrawalsReducer from './slices/withdrawalsSlice';
import ragequitsReducer from './slices/ragequitsSlice';

export const storeFactory = () => configureStore({
  reducer: {
    deposits: depositsReducer,
    entrypointDeposits: entrypointDepositsReducer,
    withdrawals: withdrawalsReducer,
    ragequits: ragequitsReducer,
  },
});

type StoreType = ReturnType<typeof storeFactory>;

export type RootState = ReturnType<StoreType['getState']>;
export type AppDispatch = StoreType['dispatch'];
