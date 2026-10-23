import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { useSessionStore } from '../stores/sessionStore.ts';
import { useSettingsStore } from '../stores/settingsStore.ts';

// Presentation extras are off by default in tests; dedicated tests switch them on.
beforeEach(() => {
  useSettingsStore.setState({ realisticReplies: false, ticker: false, sound: false });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
  useSessionStore.setState({ session: null, sessionLost: false });
});
