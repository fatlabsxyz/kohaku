import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { IPool } from '../../data/interfaces/events.interface';

export interface PoolsState {
  pools: Map<bigint, IPool>;
}

const initialState: PoolsState = {
  pools: new Map(),
};

export const poolsSlice = createSlice({
  name: 'pools',
  initialState,
  reducers: {
    registerPool: (state, action: PayloadAction<IPool>) => {
      const key = action.payload.address;
      const newPools = new Map(state.pools);
      newPools.set(key, action.payload);
      return { pools: newPools };
    },
    registerPools: (state, action: PayloadAction<IPool[]>) => {
      const newPools = new Map(state.pools);
      action.payload.forEach((pool) => {
        const key = pool.address;
        newPools.set(key, pool);
      });
      return { pools: newPools };
    },
  },
});

export const { registerPool, registerPools } = poolsSlice.actions;
export default poolsSlice.reducer;
