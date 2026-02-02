import { createAsyncThunk, Selector } from '@reduxjs/toolkit';
import { IDataService } from '../../data/interfaces/data.service.interface';
import { IPool } from '../../data/interfaces/events.interface';
import { registerPools } from '../slices/poolsSlice';
import { RootState } from '../store';

export interface SyncPoolsThunkParams {
  dataService: IDataService;
  myUnsyncedPoolsSelector: () => bigint[];
}

export const syncPoolsThunk = createAsyncThunk<void, SyncPoolsThunkParams, { state: RootState }>(
  'pools/sync',
  async ({ dataService, myUnsyncedPoolsSelector }, { dispatch }) => {
    const myUnsyncedPools = myUnsyncedPoolsSelector();

    // Fetch asset address for each pool and create IPool objects
    const pools: IPool[] = await Promise.all(
      myUnsyncedPools.map(async (poolAddress) => {
        const [assetAddress, scope] = await Promise.all([dataService.getPoolAsset(poolAddress), dataService.getPoolScope(poolAddress)]);

        return {
          address: poolAddress,
          assetAddress,
          scope,
        };
      })
    );

    // Register all pools at once
    if (pools.length > 0) {
      dispatch(registerPools(pools));
    }
  }
);
