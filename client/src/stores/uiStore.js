import { create } from 'zustand';

export const useUIStore = create((set) => ({
  showMembers: false,
  showSearch: false,
  showCreateRoom: false,
  showSettings: false,
  showPerformance: false,
  mobileMenuOpen: false,
  activeTab: 'rooms',

  toggleMembers: () => set((s) => ({ showMembers: !s.showMembers })),
  toggleSearch: () => set((s) => ({ showSearch: !s.showSearch })),
  toggleCreateRoom: () => set((s) => ({ showCreateRoom: !s.showCreateRoom })),
  toggleSettings: () => set((s) => ({ showSettings: !s.showSettings })),
  togglePerformance: () => set((s) => ({ showPerformance: !s.showPerformance })),
  toggleMobileMenu: () => set((s) => ({ mobileMenuOpen: !s.mobileMenuOpen })),
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
