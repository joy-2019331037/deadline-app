import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

export interface Settings {
  /** Agents take a believable moment to read and type before replies appear. */
  realisticReplies: boolean;
  /** Scrolling news ticker along the bottom of the game screens. */
  ticker: boolean;
  /** Short synthesized cues for breaking news and deals. */
  sound: boolean;
}

interface SettingsState extends Settings {
  setSetting: <Key extends keyof Settings>(key: Key, value: Settings[Key]) => void;
}

export const SETTINGS_STORAGE_KEY = 'deadline-settings';

export const DEFAULT_SETTINGS: Settings = { realisticReplies: true, ticker: true, sound: false };

// Storage can be unavailable (private windows, blocked site data); settings then last for the visit.
const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch {
      // ignore
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch {
      // ignore
    }
  },
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      setSetting: (key, value) => set({ [key]: value } as Partial<Settings>),
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      storage: createJSONStorage(() => safeStorage),
      partialize: ({ realisticReplies, ticker, sound }) => ({ realisticReplies, ticker, sound }),
    },
  ),
);
