import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    theme: 'light', // 'light' | 'dark'
    language: 'en',  // 'en' | 'ta'
    isOffline: false,
    globalLoading: false,
    isAIOpen: false,
  },
  reducers: {
    setTheme: (state, action) => { state.theme = action.payload; },
    toggleTheme: (state) => { state.theme = state.theme === 'light' ? 'dark' : 'light'; },
    setLanguage: (state, action) => { state.language = action.payload; },
    setOffline: (state, action) => { state.isOffline = action.payload; },
    setGlobalLoading: (state, action) => { state.globalLoading = action.payload; },
    toggleAI: (state) => { state.isAIOpen = !state.isAIOpen; },
    setAIOpen: (state, action) => { state.isAIOpen = action.payload; },
  },
});

export const { setTheme, toggleTheme, setLanguage, setOffline, setGlobalLoading, toggleAI, setAIOpen } = uiSlice.actions;
export default uiSlice.reducer;
