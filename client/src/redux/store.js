import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import groupReducer from './groupSlice';
import locationReducer from './locationSlice';
import geofenceReducer from './geofenceSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    groups: groupReducer,
    location: locationReducer,
    geofences: geofenceReducer,
  },
});
