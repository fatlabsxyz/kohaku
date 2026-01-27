import { createAsyncThunk } from '@reduxjs/toolkit';
import { IDataService } from '../../data/interfaces/data.service.interface';
import { selectLastSyncedBlock } from '../selectors/last-synced-block.selector';
import { registerDeposits } from '../slices/depositsSlice';
import { registerWithdrawals } from '../slices/withdrawalsSlice';
import { registerRagequits } from '../slices/ragequitsSlice';
import { RootState } from '../store';

export interface SyncThunkParams {
  dataService: IDataService;
  entrypointAddress: string;
}

export const syncThunk = createAsyncThunk<void, SyncThunkParams, { state: RootState }>(
  'sync/fetchEvents',
  async ({ dataService, entrypointAddress }, { getState, dispatch }) => {
    const state = getState();
    const lastSyncedBlock = selectLastSyncedBlock(state);
    const fromBlock = lastSyncedBlock + 1;

    const events = await dataService.getEvents({
      fromBlock,
      address: entrypointAddress,
    });

    if (events.PoolDeposited.length > 0) {
      dispatch(registerDeposits(events.PoolDeposited));
    }

    if (events.Withdrawn.length > 0) {
      dispatch(registerWithdrawals(events.Withdrawn));
    }

    if (events.Ragequit.length > 0) {
      dispatch(registerRagequits(events.Ragequit));
    }
  }
);
