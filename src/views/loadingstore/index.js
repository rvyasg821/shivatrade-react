// src/slices/loadingSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isLoadingGlobally: false,  // Global loading state
};

const loadingSlice = createSlice({
  name: 'loading',
  initialState,
  reducers: {
    startLoading: (state) => {      
      state.isLoadingGlobally = true;
    },
    stopLoading: (state) => {
      state.isLoadingGlobally = false;
    },
  },
});

export const { startLoading, stopLoading } = loadingSlice.actions;
export default loadingSlice.reducer;
