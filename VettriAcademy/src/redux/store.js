import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers } from '@reduxjs/toolkit';

import authReducer from './slices/authSlice';
import classesReducer from './slices/classesSlice';
import materialsReducer from './slices/materialsSlice';
import chatReducer from './slices/chatSlice';
import notificationsReducer from './slices/notificationsSlice';
import uiReducer from './slices/uiSlice';
import teacherReducer from './slices/teacherSlice';
import adminReducer from './slices/adminSlice';
import pdfReducer from './slices/pdfSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  classes: classesReducer,
  materials: materialsReducer,
  chat: chatReducer,
  notifications: notificationsReducer,
  ui: uiReducer,
  teacher: teacherReducer,
  admin: adminReducer,
  pdf: pdfReducer,
});

const persistConfig = {
  key: 'vettri-academy',
  version: 1,
  storage: AsyncStorage,
  whitelist: ['auth', 'ui'], // Only persist auth and UI state
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);
