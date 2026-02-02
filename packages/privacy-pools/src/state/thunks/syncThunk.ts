import { createAsyncThunk, Selector } from '@reduxjs/toolkit';
import { IDataService } from '../../data/interfaces/data.service.interface';
import { selectLastSyncedBlock } from '../selectors/last-synced-block.selector';
import { registerDeposits } from '../slices/depositsSlice';
import { registerWithdrawals } from '../slices/withdrawalsSlice';
import { registerRagequits } from '../slices/ragequitsSlice';
import { RootState } from '../store';
import { registerEntrypointDeposits } from '../slices/entrypointDepositsSlice';
import { syncPoolsThunk, SyncPoolsThunkParams } from './syncPoolsThunk';
import { syncAssetsThunk, SyncAssetsThunkParams } from './syncAssetsThunk';
import { registerLastUpdateRootEvent } from '../slices/updateRootEventsSlice';
import { syncAspThunk, SyncAspThunkParams } from './syncAspThunk';

export interface SyncThunkParams extends
  SyncPoolsThunkParams,
  SyncAssetsThunkParams,
  SyncAspThunkParams {
    dataService: IDataService;
}

export const syncThunk = createAsyncThunk<void, SyncThunkParams, { state: RootState }>(
  'sync/fetchEvents',
  async ({ dataService, ...params }, { getState, dispatch }) => {
    const state = getState();
    const lastSyncedBlock = selectLastSyncedBlock(state);
    const fromBlock = lastSyncedBlock + 1;

    const events = await dataService.getEvents({
      fromBlock,
      address: state.poolInfo.entrypointAddress,
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

    if (events.EntrypointDeposited.length > 0) {
      dispatch(registerEntrypointDeposits(events.EntrypointDeposited));
    }

    if (events.RootUpdated.length) {
      dispatch(registerLastUpdateRootEvent(events.RootUpdated.at(-1)!));
    }

    await dispatch(syncPoolsThunk({ dataService, ...params }));
    
    await dispatch(syncAssetsThunk({ dataService, ...params }));

    await dispatch(syncAspThunk({...params}));
  }
);
