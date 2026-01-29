import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { IEntrypointDepositEvent } from '../../data/interfaces/events.interface';
import { Commitment } from '../../interfaces/types.interface';

export interface EntrypointDepositsState {
  entrypointDeposits: Map<Commitment, IEntrypointDepositEvent>;
}

const initialState: EntrypointDepositsState = {
  entrypointDeposits: new Map(),
};

export const entrypointDepositsSlice = createSlice({
  name: 'entrypointDeposits',
  initialState,
  reducers: {
    registerEntrypointDeposit: (state, action: PayloadAction<IEntrypointDepositEvent>) => {
      const key = action.payload.commitment;
      const newDeposits = new Map(state.entrypointDeposits);
      newDeposits.set(key, action.payload);
      return { entrypointDeposits: newDeposits };
    },
    registerEntrypointDeposits: (state, action: PayloadAction<IEntrypointDepositEvent[]>) => {
      const newDeposits = new Map(state.entrypointDeposits);
      action.payload.forEach((deposit) => {
        const key = deposit.commitment;
        newDeposits.set(key, deposit);
      });
      return { entrypointDeposits: newDeposits };
    },
  },
});

export const { registerEntrypointDeposit, registerEntrypointDeposits } = entrypointDepositsSlice.actions;
export default entrypointDepositsSlice.reducer;
