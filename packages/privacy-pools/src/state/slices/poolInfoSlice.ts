import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Address } from '../../interfaces/types.interface';

export interface PoolInfoState {
  chainId: bigint;
  entrypointAddress: Address;
}

const initialState: PoolInfoState = {
  chainId: 0n,
  entrypointAddress: 0n,
};

export const poolInfoSlice = createSlice({
  name: 'poolInfo',
  initialState,
  reducers: {
    setPoolInfo: (state, {payload: { chainId, entrypointAddress }}: PayloadAction<{ chainId: bigint; entrypointAddress: bigint }>) => {
      return {
        chainId,
        entrypointAddress,
      };
    },
  },
});

export const { setPoolInfo } = poolInfoSlice.actions;
export default poolInfoSlice.reducer;
