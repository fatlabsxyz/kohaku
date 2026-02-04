import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Address } from '../../interfaces/types.interface';
import { Serializable } from '../interfaces/utils.interface';
import { serialize } from '../utils/serialize.utils';

export interface PoolInfoState {
  chainId: bigint;
  entrypointAddress: Address;
}

type ActualPoolInfoState = Serializable<PoolInfoState>;

const initialState: ActualPoolInfoState = {
  chainId: '0',
  entrypointAddress: '0',
};

export const poolInfoSlice = createSlice({
  name: 'poolInfo',
  initialState,
  reducers: {
    setPoolInfo: (state, {payload: { chainId, entrypointAddress }}: PayloadAction<PoolInfoState>) => {
      return serialize({
        chainId,
        entrypointAddress,
      });
    },
  },
});

export const { setPoolInfo } = poolInfoSlice.actions;
export default poolInfoSlice.reducer;
