import { create } from 'zustand';
import { request } from '../lib/afterlink.js';

export const useRoomStore = create((set) => ({
  rooms: [],
  isLoading: false,

  loadRooms: async () => {
    set({ isLoading: true });
    try {
      const res = await request('rooms.list', {});
      if (res.ok) set({ rooms: res.data, isLoading: false });
      else set({ isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  createRoom: async (name, type = 'public', description = '') => {
    try {
      const res = await request('rooms.create', { name, type, description });
      if (res.ok) {
        set((state) => ({ rooms: [res.data, ...state.rooms] }));
        return res.data;
      }
      return null;
    } catch {
      return null;
    }
  },

  joinRoom: async (roomId) => {
    try {
      const res = await request('rooms.join', { roomId });
      if (res.ok) return true;
      return false;
    } catch {
      return false;
    }
  },

  leaveRoom: async (roomId) => {
    try {
      const res = await request('rooms.leave', { roomId });
      if (res.ok) {
        set((state) => ({ rooms: state.rooms.filter(r => r.id !== roomId) }));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },
}));
