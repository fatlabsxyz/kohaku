import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { IEntrypointDepositEvent } from '../../data/interfaces/events.interface';
import { Commitment } from '../../interfaces/types.interface';

export interface EntrypointDepositsState {
  entrypointDepositsTuples: [Commitment, IEntrypointDepositEvent][];
}

const initialState: EntrypointDepositsState = {
  entrypointDepositsTuples: [],
};

export const entrypointDepositsSlice = createSlice({
  name: 'entrypointDeposits',
  initialState,
  reducers: {
    registerEntrypointDeposits: ({ entrypointDepositsTuples }, { payload: entrypointDeposits }: PayloadAction<IEntrypointDepositEvent[]>) => {
      const newDeposits = new Map(entrypointDepositsTuples);

      entrypointDeposits.forEach((deposit) => {
        const key = deposit.commitment;

        newDeposits.set(key, deposit);
      });

      return { entrypointDepositsTuples: Array.from(newDeposits) };
    },
  },
});

export const { registerEntrypointDeposits } = entrypointDepositsSlice.actions;
export default entrypointDepositsSlice.reducer;
