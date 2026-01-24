import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { IPoolDepositEvent } from '../data/interfaces/events.interface';

export interface DepositsState {
  deposits: Map<string, IPoolDepositEvent>;
}

const initialState: DepositsState = {
  deposits: new Map(),
};

export const depositsSlice = createSlice({
  name: 'deposits',
  initialState,
  reducers: {
    registerDeposit: (state, action: PayloadAction<IPoolDepositEvent>) => {
      const key = action.payload.precommitment.toString();
      state.deposits.set(key, action.payload);
    },
    registerDeposits: (state, action: PayloadAction<IPoolDepositEvent[]>) => {
      action.payload.forEach((deposit) => {
        const key = deposit.precommitment.toString();
        state.deposits.set(key, deposit);
      });
    },
  },
});

export const { registerDeposit, registerDeposits } = depositsSlice.actions;
export default depositsSlice.reducer;
