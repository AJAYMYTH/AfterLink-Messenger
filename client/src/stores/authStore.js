import { create } from 'zustand';
import { connect, disconnect, request, isConnected } from '../lib/afterlink.js';

const TOKEN_KEY = 'afterlink_token';
const USER_KEY = 'afterlink_user';

function loadToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
function saveToken(token) {
  try { if (token) localStorage.setItem(TOKEN_KEY, token); else localStorage.removeItem(TOKEN_KEY); } catch {} }
function loadUser() {
  try { const raw = localStorage.getItem(USER_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function saveUser(user) {
  try { if (user) localStorage.setItem(USER_KEY, JSON.stringify(user)); else localStorage.removeItem(USER_KEY); } catch {} }

export const useAuthStore = create((set, get) => ({
  user: loadUser(),
  token: loadToken(),
  isConnected: false,
  isLoading: false,
  error: null,

  initialize: async () => {
    const { token, user } = get();
    if (token && user) {
      try {
        set({ isLoading: true });
        await connect(token);
        set({ isConnected: true, isLoading: false });
      } catch {
        saveToken(null);
        saveUser(null);
        set({ user: null, token: null, isConnected: false, isLoading: false, error: 'Session expired. Please log in again.' });
      }
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      await connect(null);
      const res = await request('auth.login', { email, password });
      if (!res.ok) {
        await disconnect();
        set({ isLoading: false, error: res.error || 'Login failed' });
        return false;
      }
      const { user, token } = res.data;
      saveToken(token);
      saveUser(user);
      await connect(token);
      set({ user, token, isConnected: true, isLoading: false });
      return true;
    } catch (err) {
      await disconnect();
      set({ isLoading: false, error: err.message || 'Connection failed' });
      return false;
    }
  },

  register: async (username, email, password, displayName) => {
    set({ isLoading: true, error: null });
    try {
      await connect(null);
      const res = await request('auth.register', { username, email, password, displayName });
      if (!res.ok) {
        await disconnect();
        set({ isLoading: false, error: res.error || 'Registration failed' });
        return false;
      }
      const { user, token } = res.data;
      saveToken(token);
      saveUser(user);
      await connect(token);
      set({ user, token, isConnected: true, isLoading: false });
      return true;
    } catch (err) {
      await disconnect();
      set({ isLoading: false, error: err.message || 'Connection failed' });
      return false;
    }
  },

  logout: async () => {
    try {
      if (isConnected()) await request('auth.logout', {});
    } catch {}
    await disconnect();
    saveToken(null);
    saveUser(null);
    set({ user: null, token: null, isConnected: false, error: null });
  },

  updateUser: (updates) => {
    const user = { ...get().user, ...updates };
    saveUser(user);
    set({ user });
  },

  clearError: () => set({ error: null }),
}));
