import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/location/`;

// Helper to get auth header
const getConfig = (thunkAPI) => {
  const token = thunkAPI.getState().auth.user?.token;
  return {
    headers: { Authorization: `Bearer ${token}` },
  };
};

// Update user location in DB (Persist)
export const updateLocation = createAsyncThunk(
  'location/update',
  async (locationData, thunkAPI) => {
    try {
      const response = await axios.put(API_URL, locationData, getConfig(thunkAPI));
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.error || error.message;
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Fetch location history
export const fetchHistory = createAsyncThunk(
  'location/fetchHistory',
  async (userId, thunkAPI) => {
    try {
      const response = await axios.get(`${API_URL}history/${userId}`, getConfig(thunkAPI));
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.error || error.message;
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Fetch location history range
export const fetchHistoryRange = createAsyncThunk(
  'location/fetchHistoryRange',
  async ({ userId, startTime, endTime }, thunkAPI) => {
    try {
      let url = `${API_URL}history/range/${userId}`;
      const params = new URLSearchParams();
      if (startTime) params.append('startTime', startTime);
      if (endTime) params.append('endTime', endTime);
      if (params.toString()) url += `?${params.toString()}`;

      const response = await axios.get(url, getConfig(thunkAPI));
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.error || error.message;
      return thunkAPI.rejectWithValue(message);
    }
  }
);

const locationSlice = createSlice({
  name: 'location',
  initialState: {
    history: [],
    isInvisible: localStorage.getItem('isInvisible') === 'true',
    isLoading: false,
    isError: false,
    message: '',
  },
  reducers: {
    resetLocationState: (state) => {
      state.isError = false;
      state.message = '';
    },
    toggleInvisible: (state) => {
      state.isInvisible = !state.isInvisible;
      localStorage.setItem('isInvisible', state.isInvisible);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(updateLocation.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateLocation.fulfilled, (state) => {
        state.isLoading = false;
        state.isError = false;
      })
      .addCase(updateLocation.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(fetchHistory.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchHistory.fulfilled, (state, action) => {
        state.isLoading = false;
        state.history = action.payload;
      })
      .addCase(fetchHistory.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(fetchHistoryRange.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchHistoryRange.fulfilled, (state, action) => {
        state.isLoading = false;
        state.history = action.payload;
      })
      .addCase(fetchHistoryRange.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      });
  },
});

export const { resetLocationState, toggleInvisible } = locationSlice.actions;
export default locationSlice.reducer;
