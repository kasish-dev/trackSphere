import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/groups/`;

// Helper to get auth header
const getConfig = (thunkAPI) => {
  const token = thunkAPI.getState().auth.user?.token;
  return {
    headers: { Authorization: `Bearer ${token}` },
  };
};

// Fetch user's groups
export const fetchGroups = createAsyncThunk(
  'groups/fetchAll',
  async (_, thunkAPI) => {
    try {
      const response = await axios.get(API_URL, getConfig(thunkAPI));
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.error || error.message;
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Create a new group
export const createGroup = createAsyncThunk(
  'groups/create',
  async (groupData, thunkAPI) => {
    try {
      const response = await axios.post(API_URL, groupData, getConfig(thunkAPI));
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.error || error.message;
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Join group by invite code
export const joinGroup = createAsyncThunk(
  'groups/join',
  async (inviteData, thunkAPI) => {
    try {
      const response = await axios.post(API_URL + 'join', inviteData, getConfig(thunkAPI));
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.error || error.message;
      return thunkAPI.rejectWithValue(message);
    }
  }
);

const groupSlice = createSlice({
  name: 'groups',
  initialState: {
    groups: [],
    isLoading: false,
    isError: false,
    isSuccess: false,
    message: '',
  },
  reducers: {
    resetGroupState: (state) => {
      state.isError = false;
      state.isSuccess = false;
      state.message = '';
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch groups
      .addCase(fetchGroups.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchGroups.fulfilled, (state, action) => {
        state.isLoading = false;
        state.groups = action.payload;
      })
      .addCase(fetchGroups.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Create group
      .addCase(createGroup.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createGroup.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.groups.push(action.payload);
      })
      .addCase(createGroup.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Join group
      .addCase(joinGroup.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(joinGroup.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.groups.push(action.payload);
      })
      .addCase(joinGroup.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      });
  },
});

export const { resetGroupState } = groupSlice.actions;
export default groupSlice.reducer;
