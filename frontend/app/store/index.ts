import { configureStore } from '@reduxjs/toolkit';
import floorPlanReducer from './floorPlanSlice.js';
import authReducer from './authSlice.js';

export const store = configureStore({
  reducer: {
    floorPlan: floorPlanReducer,
    auth: authReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
