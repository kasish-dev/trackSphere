import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/`;
const getStoredUser = () => JSON.parse(localStorage.getItem('user') || 'null');

// Register user
export const register = createAsyncThunk(
  'auth/register',
  async (userData, thunkAPI) => {
    try {
      const response = await axios.post(API_URL + 'register', userData);
      if (response.data) {
        localStorage.setItem('user', JSON.stringify(response.data));
      }
      return response.data;
    } catch (error) {
      const message = error.response?.data?.error || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Login user
export const login = createAsyncThunk('auth/login', async (userData, thunkAPI) => {
  try {
    const response = await axios.post(API_URL + 'login', userData);
    if (response.data) {
      localStorage.setItem('user', JSON.stringify(response.data));
    }
    return response.data;
  } catch (error) {
    if (error.response?.status === 429) {
      return thunkAPI.rejectWithValue('Too many attempts. Please try again in 15 minutes.');
    }
    if (error.response?.status === 401) {
      return thunkAPI.rejectWithValue('Invalid email or password. If you are using demo access, run `npm run seed:demo` in `server/` first.');
    }
    const message = error.response?.data?.errors 
      ? error.response.data.errors.map(err => err.msg).join('. ')
      : error.response?.data?.error || error.message || error.toString();
    return thunkAPI.rejectWithValue(message);
  }
});

export const validateSession = createAsyncThunk('auth/validateSession', async (_, thunkAPI) => {
  try {
    const storedUser = getStoredUser();
    const token = thunkAPI.getState().auth.user?.token || storedUser?.token;

    if (!token) {
      return thunkAPI.rejectWithValue('No active session');
    }

    const response = await axios.get(API_URL + 'me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const updatedSession = {
      ...(storedUser || {}),
      token,
      user: response.data.data,
    };

    localStorage.setItem('user', JSON.stringify(updatedSession));
    return updatedSession;
  } catch (error) {
    if (error.response?.status === 401) {
      localStorage.removeItem('user');
      return thunkAPI.rejectWithValue('Session expired. Please sign in again.');
    }

    const message = error.response?.data?.error || error.message || error.toString();
    return thunkAPI.rejectWithValue(message);
  }
});

// Logout user
export const logout = createAsyncThunk('auth/logout', async () => {
  localStorage.removeItem('user');
});

// Update user preferences
export const updatePreferences = createAsyncThunk(
  'auth/updatePreferences',
  async (preferences, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
      const response = await axios.patch(API_URL + 'preferences', preferences, config);
      if (response.data.success) {
        const user = JSON.parse(localStorage.getItem('user'));
        const updatedUser = { 
          ...user, 
          user: { 
            ...user.user, 
            preferences: response.data.data.preferences 
          } 
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        return response.data.data.preferences;
      }
      return thunkAPI.rejectWithValue('Update failed');
    } catch (error) {
      const message = error.response?.data?.error || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Update user profile (e.g. emergency contacts)
export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (profileData, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
      const response = await axios.patch(API_URL + 'profile', profileData, config);
      if (response.data.success) {
        const user = JSON.parse(localStorage.getItem('user'));
        const updatedUser = { 
          ...user, 
          user: { 
            ...user.user, 
            ...response.data.data 
          } 
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        return response.data.data;
      }
      return thunkAPI.rejectWithValue('Update failed');
    } catch (error) {
      const message = error.response?.data?.error || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

const storedUser = getStoredUser();

const initialState = {
  user: storedUser,
  isError: false,
  isSuccess: false,
  isLoading: false,
  sessionChecked: !storedUser?.token,
  message: '',
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    reset: (state) => {
      state.isLoading = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = '';
    },
    syncUserSession: (state, action) => {
      if (!state.user) {
        return;
      }

      state.user.user = {
        ...state.user.user,
        ...action.payload,
      };

      localStorage.setItem('user', JSON.stringify(state.user));
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(register.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.sessionChecked = true;
        state.user = action.payload;
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.sessionChecked = true;
        state.message = action.payload;
        state.user = null;
      })
      .addCase(login.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.sessionChecked = true;
        state.user = action.payload;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.sessionChecked = true;
        state.message = action.payload;
        state.user = null;
      })
      .addCase(logout.fulfilled, (state) => {
        state.sessionChecked = true;
        state.user = null;
      })
      .addCase(validateSession.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(validateSession.fulfilled, (state, action) => {
        state.isLoading = false;
        state.sessionChecked = true;
        state.user = action.payload;
      })
      .addCase(validateSession.rejected, (state, action) => {
        state.isLoading = false;
        state.sessionChecked = true;
        state.user = null;
        if (action.payload && action.payload !== 'No active session') {
          state.isError = true;
          state.message = action.payload;
        }
      })
      .addCase(updatePreferences.fulfilled, (state, action) => {
        if (state.user) {
          state.user.user.preferences = action.payload;
        }
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        if (state.user) {
          state.user.user = {
            ...state.user.user,
            ...action.payload
          };
        }
      });
  },
});

export const { reset, syncUserSession } = authSlice.actions;
export default authSlice.reducer;
