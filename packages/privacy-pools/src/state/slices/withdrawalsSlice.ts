import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { IWithdrawalEvent } from '../../data/interfaces/events.interface';
import { Nullifier } from '../../interfaces/types.interface';

export interface WithdrawalsState {
  withdrawalsTuples: [Nullifier, IWithdrawalEvent][];
}

const initialState: WithdrawalsState = {
  withdrawalsTuples: [],
};

export const withdrawalsSlice = createSlice({
  name: 'withdrawals',
  initialState,
  reducers: {
    registerWithdrawals: ({ withdrawalsTuples }, action: PayloadAction<IWithdrawalEvent[]>) => {
      const newWithdrawals = new Map(withdrawalsTuples);
      action.payload.forEach((withdrawal) => {
        const key = withdrawal.spentNullifier;
        newWithdrawals.set(key, withdrawal);
      });
      return { withdrawalsTuples: Array.from(newWithdrawals) };
    },
  },
});

export const { registerWithdrawals } = withdrawalsSlice.actions;
export default withdrawalsSlice.reducer;
