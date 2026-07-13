import { createSlice, combineReducers } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    sidebarOpen: false, // mobile temporary drawer
    snackbar: { open: false, message: '', severity: 'success' },
  },
  reducers: {
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebar(state, action) {
      state.sidebarOpen = action.payload;
    },
    showSnackbar(state, action) {
      const { message, severity = 'success' } =
        typeof action.payload === 'string' ? { message: action.payload } : action.payload;
      state.snackbar = { open: true, message, severity };
    },
    hideSnackbar(state) {
      state.snackbar.open = false;
    },
  },
});

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: { items: [] },
  reducers: {
    setNotifications(state, action) {
      state.items = action.payload || [];
    },
    clearNotifications(state) {
      state.items = [];
    },
  },
});

export const uiActions = uiSlice.actions;
export const notificationActions = notificationsSlice.actions;

export default combineReducers({
  ui: uiSlice.reducer,
  notifications: notificationsSlice.reducer,
});
