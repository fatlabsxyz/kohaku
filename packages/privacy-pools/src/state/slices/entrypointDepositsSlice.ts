import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { IEntrypointDepositEvent } from '../../data/interfaces/events.interface';

export interface EntrypointDepositsState {
  entrypointDeposits: Map<string, IEntrypointDepositEvent>;
}

const initialState: EntrypointDepositsState = {
  entrypointDeposits: new Map(),
};

export const entrypointDepositsSlice = createSlice({
  name: 'entrypointDeposits',
  initialState,
  reducers: {
    registerEntrypointDeposit: (state, action: PayloadAction<IEntrypointDepositEvent>) => {
      const key = action.payload.commitment.toString();
      const newDeposits = new Map(state.entrypointDeposits);
      newDeposits.set(key, action.payload);
      return { entrypointDeposits: newDeposits };
    },
    registerEntrypointDeposits: (state, action: PayloadAction<IEntrypointDepositEvent[]>) => {
      const newDeposits = new Map(state.entrypointDeposits);
      action.payload.forEach((deposit) => {
        const key = deposit.commitment.toString();
        newDeposits.set(key, deposit);
      });
      return { entrypointDeposits: newDeposits };
    },
  },
});

export const { registerEntrypointDeposit, registerEntrypointDeposits } = entrypointDepositsSlice.actions;
export default entrypointDepositsSlice.reducer;
