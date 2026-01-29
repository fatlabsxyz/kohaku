import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { IPoolDepositEvent } from '../../data/interfaces/events.interface';
import { Precommitment } from '../../interfaces/types.interface';

export interface DepositsState {
  depositsTuples: [Precommitment, IPoolDepositEvent][];
}

const initialState: DepositsState = {
  depositsTuples: [],
};

export const depositsSlice = createSlice({
  name: 'deposits',
  initialState,
  reducers: {
    registerDeposits: ({ depositsTuples }, { payload: deposits }: PayloadAction<IPoolDepositEvent[]>) => {
      const newDeposits = new Map(depositsTuples);
      deposits.forEach((deposit) => {
        const key = deposit.precommitment;
        newDeposits.set(key, deposit);
      });
      return { depositsTuples: Array.from(newDeposits) };
    },
  },
});

export const { registerDeposits } = depositsSlice.actions;
export default depositsSlice.reducer;
