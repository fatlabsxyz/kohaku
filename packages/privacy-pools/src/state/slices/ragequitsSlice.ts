import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { IRagequitEvent } from '../../data/interfaces/events.interface';

export interface RagequitsState {
  ragequits: Map<string, IRagequitEvent>;
}

const initialState: RagequitsState = {
  ragequits: new Map(),
};

export const ragequitsSlice = createSlice({
  name: 'ragequits',
  initialState,
  reducers: {
    registerRagequit: (state, action: PayloadAction<IRagequitEvent>) => {
      const key = action.payload.label.toString();
      const newRagequits = new Map(state.ragequits);
      newRagequits.set(key, action.payload);
      return { ragequits: newRagequits };
    },
    registerRagequits: (state, action: PayloadAction<IRagequitEvent[]>) => {
      const newRagequits = new Map(state.ragequits);
      action.payload.forEach((ragequit) => {
        const key = ragequit.label.toString();
        newRagequits.set(key, ragequit);
      });
      return { ragequits: newRagequits };
    },
  },
});

export const { registerRagequit, registerRagequits } = ragequitsSlice.actions;
export default ragequitsSlice.reducer;
