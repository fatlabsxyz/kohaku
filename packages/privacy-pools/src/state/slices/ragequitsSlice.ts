import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { IRagequitEvent } from '../../data/interfaces/events.interface';
import { Label } from '../../interfaces/types.interface';

export interface RagequitsState {
  ragequitsTuples: [Label, IRagequitEvent][];
}

const initialState: RagequitsState = {
  ragequitsTuples: [],
};

export const ragequitsSlice = createSlice({
  name: 'ragequits',
  initialState,
  reducers: {
    registerRagequits: ({ ragequitsTuples }, action: PayloadAction<IRagequitEvent[]>) => {
      const newRagequits = new Map(ragequitsTuples);
      action.payload.forEach((ragequit) => {
        const key = ragequit.label;
        newRagequits.set(key, ragequit);
      });
      return { ragequitsTuples: Array.from(newRagequits) };
    },
  },
});

export const { registerRagequits } = ragequitsSlice.actions;
export default ragequitsSlice.reducer;
