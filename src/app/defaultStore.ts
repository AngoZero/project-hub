import type { AppStore } from './types';

export const DEFAULT_APP_STORE: AppStore = {
  version: 3,
  roots: [],
  projects: [],
  workspaces: [],
  preferences: {
    theme: 'dark',
    catalogLayout: 'grid',
    sortBy: 'lastAccessed',
    rootScanDepth: 3,
    showArchived: true,
    language: 'system',
    hasCompletedOnboarding: false,
  },
};
