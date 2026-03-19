import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import groupReducer from './groupSlice';
import locationReducer from './locationSlice';
import geofenceReducer from './geofenceSlice';
import notificationReducer from './notificationSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    groups: groupReducer,
    location: locationReducer,
    geofences: geofenceReducer,
    notifications: notificationReducer,
  },
});
