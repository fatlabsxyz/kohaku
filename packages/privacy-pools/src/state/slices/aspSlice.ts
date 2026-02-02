import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AspState {
  leaves: bigint[];
  aspTreeRoot: bigint;
}

const initialState: AspState = {
  leaves: [],
  aspTreeRoot: 0n,
};

export const aspSlice = createSlice({
  name: 'asp',
  initialState,
  reducers: {
    registerAspTree: (state, { payload: { leaves, aspTreeRoot } }: PayloadAction<AspState>) => {
      return {
        leaves,
        aspTreeRoot,
      };
    },
  },
});

export const { registerAspTree } = aspSlice.actions;
export default aspSlice.reducer;
