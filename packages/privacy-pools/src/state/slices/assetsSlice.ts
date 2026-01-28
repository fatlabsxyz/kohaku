import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { IAsset } from '../../data/interfaces/events.interface';

export interface AssetsState {
  assets: Map<bigint, IAsset>;
}

const initialState: AssetsState = {
  assets: new Map(),
};

export const assetsSlice = createSlice({
  name: 'assets',
  initialState,
  reducers: {
    registerAsset: (state, action: PayloadAction<IAsset>) => {
      const key = action.payload.address;
      const newAssets = new Map(state.assets);
      newAssets.set(key, action.payload);
      return { assets: newAssets };
    },
    registerAssets: (state, action: PayloadAction<IAsset[]>) => {
      const newAssets = new Map(state.assets);
      action.payload.forEach((asset) => {
        const key = asset.address;
        newAssets.set(key, asset);
      });
      return { assets: newAssets };
    },
  },
});

export const { registerAsset, registerAssets } = assetsSlice.actions;
export default assetsSlice.reducer;
