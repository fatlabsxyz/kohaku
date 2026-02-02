import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { IRootUpdatedEvent } from '../../data/interfaces/events.interface';

export interface UpdateRootEventsState {
  lastUpdateRootEvent: IRootUpdatedEvent | null;
}

const initialState: UpdateRootEventsState = {
  lastUpdateRootEvent: null,
};

export const updateRootEventsSlice = createSlice({
  name: 'updateRootEvents',
  initialState,
  reducers: {
    registerLastUpdateRootEvent: (state, { payload }: PayloadAction<IRootUpdatedEvent>) => {
      return {
        lastUpdateRootEvent: payload,
      };
    },
  },
});

export const { registerLastUpdateRootEvent } = updateRootEventsSlice.actions;
export default updateRootEventsSlice.reducer;
