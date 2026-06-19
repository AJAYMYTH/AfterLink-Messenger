import { create } from 'zustand';
import { request, subscribe } from '../lib/afterlink.js';

export const useChatStore = create((set, get) => ({
  messages: [],
  dms: {},
  dmInbox: [],
  activeRoomId: null,
  activeUserId: null,
  isDM: false,
  isLoading: false,
  typingUsers: {},
  _subscribedRooms: new Set(),
  _subscribedDMs: new Set(),

  setActiveRoom: (roomId) => {
    set({ activeRoomId: roomId, activeUserId: null, isDM: false, messages: [] });
  },

  setActiveDM: (userId) => {
    set({ activeUserId: userId, activeRoomId: null, isDM: true, dms: { ...get().dms, [userId]: [] } });
  },

  loadHistory: async (roomId, before) => {
    set({ isLoading: true });
    try {
      const res = await request('messages.history', { roomId, before, limit: 50 });
      if (res.ok) {
        const existing = get().messages;
        set({
          messages: [...res.data, ...existing],
          isLoading: false,
        });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  loadDMHistory: async (otherUserId, before) => {
    set({ isLoading: true });
    try {
      const res = await request('dm.history', { otherUserId, before, limit: 50 });
      if (res.ok) {
        const existing = get().dms[otherUserId] || [];
        set({
          dms: { ...get().dms, [otherUserId]: [...res.data, ...existing] },
          isLoading: false,
        });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  loadDMInbox: async () => {
    try {
      const res = await request('dm.inbox', {});
      if (res.ok) set({ dmInbox: res.data });
    } catch {}
  },

  sendMessage: async (roomId, content, type = 'text', replyTo = null) => {
    try {
      const res = await request('messages.send', { roomId, content, type, replyTo });
      return res.ok;
    } catch {
      return false;
    }
  },

  sendDM: async (receiverId, content) => {
    try {
      const res = await request('dm.send', { receiverId, content });
      return res.ok;
    } catch {
      return false;
    }
  },

  deleteMessage: async (messageId) => {
    try {
      const res = await request('messages.delete', { messageId });
      return res.ok;
    } catch {
      return false;
    }
  },

  reactToMessage: async (messageId, emoji, action = 'add') => {
    try {
      const res = await request('messages.react', { messageId, emoji, action });
      return res.ok;
    } catch {
      return false;
    }
  },

  addMessage: (msg) => {
    set((state) => {
      const roomId = msg.room_id || msg.sender_id;
      if (state.activeRoomId === roomId || state.isDM && (msg.sender_id === state.activeUserId || msg.receiver_id === state.activeUserId)) {
        if (state.isDM) {
          return { dms: { ...state.dms, [state.activeUserId]: [...(state.dms[state.activeUserId] || []), msg] } };
        }
        return { messages: [...state.messages, msg] };
      }
      return state;
    });
  },

  removeMessage: (data) => {
    set((state) => ({
      messages: state.messages.filter(m => m.id !== data.id),
      dms: Object.fromEntries(
        Object.entries(state.dms).map(([key, msgs]) => [key, msgs.filter(m => m.id !== data.id)])
      ),
    }));
  },

  updateReactions: (data) => {
    set((state) => ({
      messages: state.messages.map(m => m.id === data.messageId ? { ...m, reactions: data.reactions } : m),
    }));
  },

  setTyping: (userId, username, roomId, isTyping) => {
    set((state) => {
      const key = roomId || 'dm';
      const current = state.typingUsers[key] || {};
      if (isTyping) {
        return { typingUsers: { ...state.typingUsers, [key]: { ...current, [userId]: { userId, username, timestamp: Date.now() } } } };
      }
      const { [userId]: _, ...rest } = current;
      return { typingUsers: { ...state.typingUsers, [key]: rest } };
    });
  },

  subscribeToRoom: (roomId) => {
    if (get()._subscribedRooms.has(roomId)) return;
    get()._subscribedRooms.add(roomId);
    subscribe(`room:${roomId}`, (event) => {
      const store = get();
      if (event.event === 'new_message') store.addMessage(event.data);
      else if (event.event === 'message_deleted') store.removeMessage(event.data);
      else if (event.event === 'reaction_updated') store.updateReactions(event.data);
    });
    subscribe(`presence:${roomId}`, (event) => {
      const store = get();
      if (event.event === 'typing') {
        store.setTyping(event.userId, event.username, roomId, event.isTyping);
      }
    });
  },

  subscribeToDM: (userId) => {
    if (get()._subscribedDMs.has(userId)) return;
    get()._subscribedDMs.add(userId);
    subscribe(`dm:${userId}`, (event) => {
      get().addMessage(event.data);
    });
  },

  clearTyping: (roomId) => {
    set((state) => ({
      typingUsers: { ...state.typingUsers, [roomId || 'dm']: {} },
    }));
  },
}));
