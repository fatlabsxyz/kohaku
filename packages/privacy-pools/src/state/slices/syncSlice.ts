import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface SyncState {
  lastSyncedBlock: bigint;
}

const initialState: SyncState = {
  lastSyncedBlock: 0n,
};

export const syncSlice = createSlice({
  name: 'sync',
  initialState,
  reducers: {
    setLastSyncedBlock: (state, { payload }: PayloadAction<bigint>) => {
      return {
        lastSyncedBlock: payload,
      };
    },
  },
});

export const { setLastSyncedBlock } = syncSlice.actions;
export default syncSlice.reducer;
