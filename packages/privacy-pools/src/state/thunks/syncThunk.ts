import { createAsyncThunk, unwrapResult } from '@reduxjs/toolkit';
import { IDataService } from '../../data/interfaces/data.service.interface';
import { selectLastSyncedBlock } from '../selectors/last-synced-block.selector';
import { RootState } from '../store';
import { registerEntrypointDeposits } from '../slices/entrypointDepositsSlice';
import { syncPoolsThunk, SyncPoolsThunkParams } from './syncPoolsThunk';
import { syncAssetsThunk, SyncAssetsThunkParams } from './syncAssetsThunk';
import { registerLastUpdateRootEvent } from '../slices/updateRootEventsSlice';
import { syncAspThunk, SyncAspThunkParams } from './syncAspThunk';
import { setLastSyncedBlock } from '../slices/syncSlice';
import { syncEventsThunk, SyncEventsThunkParams } from './syncEventsThunk';

export interface SyncThunkParams extends
  SyncEventsThunkParams,
  Omit<SyncPoolsThunkParams, 'poolsRegistered' | 'poolsWoundDown'>,
  SyncAssetsThunkParams,
  SyncAspThunkParams {
  dataService: IDataService;
}

export const syncThunk = createAsyncThunk<void, SyncThunkParams, { state: RootState; }>(
  'sync/fetchEvents',
  async ({ dataService, ...params }, { getState, dispatch }) => {
    const state = getState();
    const lastSyncedBlock = selectLastSyncedBlock(state);
    const fromBlock = lastSyncedBlock + 1n;

    const {
      EntrypointDeposited,
      RootUpdated,
      PoolRegistered: poolsRegistered,
      PoolWindDown: poolsWoundDown
    } = await dataService.getEntrypointEvents({
      events: [
        "EntrypointDeposited",
        "RootUpdated",
        "PoolRegistered",
        "PoolWindDown"
      ],
      fromBlock,
      address: state.poolInfo.entrypointAddress,
    });

    await dispatch(syncPoolsThunk({
      poolsRegistered,
      poolsWoundDown,
    }));

    if (EntrypointDeposited.length > 0) {
      dispatch(registerEntrypointDeposits(EntrypointDeposited));
    }

    if (RootUpdated.length) {
      dispatch(registerLastUpdateRootEvent(RootUpdated.at(-1)!));
    }

    const syncEventsResult = await dispatch(syncEventsThunk({ dataService, ...params }));

    const syncEventsLastBlock = unwrapResult(syncEventsResult);

    await dispatch(syncAssetsThunk({ dataService, ...params }));

    await dispatch(syncAspThunk({ ...params }));

    dispatch(setLastSyncedBlock(syncEventsLastBlock));
  }
);
