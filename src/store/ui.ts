import { create } from 'zustand';

export type TabType = 'home' | 'search' | 'collection' | 'orders' | 'chats';

interface UIState {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (isOpen: boolean) => void;
  activeCategoryId: string | null;
  setActiveCategoryId: (id: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeTab: 'home',
  setActiveTab: (tab) => set({ activeTab: tab }),
  isSearchOpen: false,
  setIsSearchOpen: (isOpen) => set({ isSearchOpen: isOpen }),
  activeCategoryId: null,
  setActiveCategoryId: (id) => set({ activeCategoryId: id })
}));
