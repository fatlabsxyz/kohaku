import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AspState {
  leaves: bigint[];
  aspTreeRoot: bigint;
  blockNumber: bigint;
}

const initialState: AspState = {
  leaves: [],
  aspTreeRoot: 0n,
  blockNumber: 0n,
};

export const aspSlice = createSlice({
  name: 'asp',
  initialState,
  reducers: {
    registerAspTree: (state, { payload }: PayloadAction<AspState>) => {
      return payload;
    },
  },
});

export const { registerAspTree } = aspSlice.actions;
export default aspSlice.reducer;
