import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { IPool } from '../../data/interfaces/events.interface';
import { Address } from '../../interfaces/types.interface';

export interface PoolsState {
  poolsTuples: [Address, IPool][];
}

const initialState: PoolsState = {
  poolsTuples: [],
};

export const poolsSlice = createSlice({
  name: 'pools',
  initialState,
  reducers: {
    registerPools: ({ poolsTuples }, { payload: pools }: PayloadAction<IPool[]>) => {
      const newPools = new Map(poolsTuples);
      pools.forEach((pool) => {
        const key = pool.address;
        newPools.set(key, pool);
      });
      return { poolsTuples: Array.from(newPools) };
    },
  },
});

export const { registerPools } = poolsSlice.actions;
export default poolsSlice.reducer;
