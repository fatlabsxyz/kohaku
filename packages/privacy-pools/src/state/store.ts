import { configureStore } from '@reduxjs/toolkit';
import depositsReducer from './slices/depositsSlice';
import withdrawalsReducer from './slices/withdrawalsSlice';
import ragequitsReducer from './slices/ragequitsSlice';
import poolsReducer from './slices/poolsSlice';
import assetsReducer from './slices/assetsSlice';

export const storeFactory = () => configureStore({
  reducer: {
    deposits: depositsReducer,
    withdrawals: withdrawalsReducer,
    ragequits: ragequitsReducer,
    pools: poolsReducer,
    assets: assetsReducer,
  },
});

type StoreType = ReturnType<typeof storeFactory>;

export type RootState = ReturnType<StoreType['getState']>;
export type AppDispatch = StoreType['dispatch'];
