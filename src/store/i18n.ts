import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Language = 'en' | 'hi' | 'mr';

interface I18nStore {
  language: Language;
  setLanguage: (lang: Language) => void;
}

export const useI18nStore = create<I18nStore>()(
  persist(
    (set) => ({
      language: 'en',
      setLanguage: (lang) => set({ language: lang }),
    }),
    {
      name: 'aashirwad-language',
    }
  )
);
