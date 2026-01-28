import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { IPoolDepositEvent } from '../../data/interfaces/events.interface';

export interface DepositsState {
  deposits: Map<bigint, IPoolDepositEvent>;
}

const initialState: DepositsState = {
  deposits: new Map(),
};

export const depositsSlice = createSlice({
  name: 'deposits',
  initialState,
  reducers: {
    registerDeposit: (state, action: PayloadAction<IPoolDepositEvent>) => {
      const key = action.payload.precommitment;
      const newDeposits = new Map(state.deposits);
      newDeposits.set(key, action.payload);
      return { deposits: newDeposits };
    },
    registerDeposits: (state, action: PayloadAction<IPoolDepositEvent[]>) => {
      const newDeposits = new Map(state.deposits);
      action.payload.forEach((deposit) => {
        const key = deposit.precommitment;
        newDeposits.set(key, deposit);
      });
      return { deposits: newDeposits };
    },
  },
});

export const { registerDeposit, registerDeposits } = depositsSlice.actions;
export default depositsSlice.reducer;
