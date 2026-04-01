import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/groups/`;

const getConfig = (thunkAPI) => {
  const token = thunkAPI.getState().auth.user?.token;
  return {
    headers: { Authorization: `Bearer ${token}` },
  };
};

export const fetchGeofences = createAsyncThunk(
  'geofences/fetchAll',
  async (groupId, thunkAPI) => {
    try {
      const response = await axios.get(`${API_URL}${groupId}/geofences`, getConfig(thunkAPI));
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.error || error.message;
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const createGeofence = createAsyncThunk(
  'geofences/create',
  async ({ groupId, fenceData }, thunkAPI) => {
    try {
      const response = await axios.post(`${API_URL}${groupId}/geofences`, fenceData, getConfig(thunkAPI));
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.error || error.message;
      return thunkAPI.rejectWithValue(message);
    }
  }
);

const geofenceSlice = createSlice({
  name: 'geofences',
  initialState: {
    fences: [],
    isLoading: false,
    isError: false,
    message: '',
  },
  reducers: {
    resetGeofenceState: (state) => {
      state.isError = false;
      state.message = '';
    },
    addGeofence: (state, action) => {
      // Avoid duplicates
      if (!state.fences.find(f => f._id === action.payload._id)) {
        state.fences.push(action.payload);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGeofences.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchGeofences.fulfilled, (state, action) => {
        state.isLoading = false;
        state.fences = action.payload;
      })
      .addCase(fetchGeofences.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(createGeofence.fulfilled, (state, action) => {
        state.fences.push(action.payload);
      });
  },
});

export const { resetGeofenceState, addGeofence } = geofenceSlice.actions;
export default geofenceSlice.reducer;
