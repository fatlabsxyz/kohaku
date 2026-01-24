import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { IWithdrawalEvent } from '../../data/interfaces/events.interface';

export interface WithdrawalsState {
  withdrawals: Map<string, IWithdrawalEvent>;
}

const initialState: WithdrawalsState = {
  withdrawals: new Map(),
};

export const withdrawalsSlice = createSlice({
  name: 'withdrawals',
  initialState,
  reducers: {
    registerWithdrawal: (state, action: PayloadAction<IWithdrawalEvent>) => {
      const key = action.payload.spentNullifier.toString();
      const newWithdrawals = new Map(state.withdrawals);
      newWithdrawals.set(key, action.payload);
      return { withdrawals: newWithdrawals };
    },
    registerWithdrawals: (state, action: PayloadAction<IWithdrawalEvent[]>) => {
      const newWithdrawals = new Map(state.withdrawals);
      action.payload.forEach((withdrawal) => {
        const key = withdrawal.spentNullifier.toString();
        newWithdrawals.set(key, withdrawal);
      });
      return { withdrawals: newWithdrawals };
    },
  },
});

export const { registerWithdrawal, registerWithdrawals } = withdrawalsSlice.actions;
export default withdrawalsSlice.reducer;
