import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface GameSessionCredential {
  gameId: string;
  token: string;
}

interface SessionState {
  session: GameSessionCredential | null;
  sessionLost: boolean;
  setSession: (session: GameSessionCredential) => void;
  clearSession: (options?: { lost?: boolean }) => void;
}

export const SESSION_STORAGE_KEY = 'deadline-session';

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      session: null,
      sessionLost: false,
      setSession: (session) => set({ session, sessionLost: false }),
      clearSession: ({ lost = false } = {}) => set({ session: null, sessionLost: lost }),
    }),
    {
      name: SESSION_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ session: state.session }),
    },
  ),
);
