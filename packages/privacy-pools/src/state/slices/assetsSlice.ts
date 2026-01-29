import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { IAsset } from '../../data/interfaces/events.interface';
import { Address } from '../../interfaces/types.interface';

export interface AssetsState {
  assetsTuples: [Address, IAsset][];
}

const initialState: AssetsState = {
  assetsTuples: [],
};

export const assetsSlice = createSlice({
  name: 'assets',
  initialState,
  reducers: {
    registerAssets: ({ assetsTuples }, { payload: assets }: PayloadAction<IAsset[]>) => {
      const newAssets = new Map(assetsTuples);
      assets.forEach((asset) => {
        const key = asset.address;
        newAssets.set(key, asset);
      });
      return { assetsTuples: Array.from(newAssets) };
    },
  },
});

export const { registerAssets } = assetsSlice.actions;
export default assetsSlice.reducer;
