import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UIState } from '../../types';

interface Notification {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

interface UIStateWithNotifications extends UIState {
  notifications: Notification[];
}

const initialState: UIStateWithNotifications = {
  sidebarOpen: false,
  theme: 'dark',
  notifications: [],
  loading: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
    },
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id'>>) => {
      state.notifications.push({
        id: Date.now(),
        ...action.payload,
      });
    },
    removeNotification: (state, action: PayloadAction<number>) => {
      state.notifications = state.notifications.filter(
        notification => notification.id !== action.payload
      );
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
});

export const { 
  toggleSidebar, 
  setSidebarOpen, 
  setTheme, 
  addNotification, 
  removeNotification, 
  setLoading 
} = uiSlice.actions;
export default uiSlice.reducer;
