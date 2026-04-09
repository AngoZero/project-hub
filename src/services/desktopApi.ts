import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { detectPlatform } from '../app/platform';
import { FALLBACK_STORE } from '../app/demoData';
import type { ActionResult, AppStore, Preferences, ProjectRecord, RootFolder } from '../app/types';
import { getComparablePath, getPathLeafName, normalizePath } from '../utils/paths';

const STORAGE_KEY = 'project-hub-browser-store';

type ProjectActionKind =
  | 'openFinder'
  | 'openCode'
  | 'openTerminal'
  | 'openClaude'
  | 'openCodex'
  | 'openLocalUrl'
  | 'runQuickCommand';

interface ProjectActionPayload {
  kind: ProjectActionKind;
  targetId?: string;
  language?: string;
}

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && typeof window.__TAURI_INTERNALS__ !== 'undefined';
}

function cloneStore(store: AppStore): AppStore {
  const normalizedPreferences: Preferences = {
    ...store.preferences,
    language: store.preferences.language ?? 'system',
  };

  return {
    ...store,
    roots: store.roots.map((root) => ({ ...root })),
    projects: store.projects.map((project) => ({
      ...project,
      tags: [...project.tags],
      stack: [...project.stack],
      detectedStack: [...project.detectedStack],
      quickCommands: project.quickCommands.map((item) => ({ ...item })),
      localUrls: project.localUrls.map((item) => ({ ...item })),
      detectedFiles: [...project.detectedFiles],
      notes: { ...project.notes },
      git: { ...project.git },
    })),
    preferences: normalizedPreferences,
  };
}

function loadBrowserStore(): AppStore {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(FALLBACK_STORE));
    return cloneStore(FALLBACK_STORE);
  }

  try {
    return cloneStore(JSON.parse(raw) as AppStore);
  } catch {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(FALLBACK_STORE));
    return cloneStore(FALLBACK_STORE);
  }
}

function saveBrowserStore(store: AppStore): AppStore {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  return cloneStore(store);
}

async function fallbackAction(message: string): Promise<ActionResult> {
  return {
    ok: false,
    message,
  };
}

export async function loadAppStore(): Promise<AppStore> {
  if (!isTauriRuntime()) {
    return loadBrowserStore();
  }

  return invoke<AppStore>('load_app_state');
}

export async function scanProjects(): Promise<AppStore> {
  if (!isTauriRuntime()) {
    return loadBrowserStore();
  }

  return invoke<AppStore>('scan_projects');
}

export async function saveProject(project: ProjectRecord): Promise<AppStore> {
  if (!isTauriRuntime()) {
    const store = loadBrowserStore();
    const platform = detectPlatform();
    const normalizedProjectPath = normalizePath(project.path, platform);
    const comparableProjectPath = getComparablePath(project.path, platform);
    const duplicateProject = store.projects.find((item) => getComparablePath(item.path, platform) === comparableProjectPath && item.id !== project.id);

    if (duplicateProject) {
      throw new Error('DUPLICATE_PROJECT_PATH');
    }

    const nextProject = {
      ...project,
      path: normalizedProjectPath,
    };
    const existingIndex = store.projects.findIndex((item) => item.id === project.id);

    if (existingIndex >= 0) {
      store.projects[existingIndex] = nextProject;
    } else {
      store.projects.unshift(nextProject);
    }

    return saveBrowserStore(store);
  }

  return invoke<AppStore>('save_project', { project });
}

export async function pickProjectFolder(): Promise<string | null> {
  if (!isTauriRuntime()) {
    const value = window.prompt('Absolute project folder path');
    return value ? normalizePath(value, detectPlatform()) : null;
  }

  const selected = await open({
    directory: true,
    multiple: false,
  });

  return typeof selected === 'string' ? normalizePath(selected, detectPlatform()) : null;
}

export async function inspectProjectPath(path: string): Promise<ProjectRecord> {
  if (!isTauriRuntime()) {
    const platform = detectPlatform();
    const normalizedPath = normalizePath(path, platform);
    const name = getPathLeafName(normalizedPath, platform);
    const now = new Date().toISOString();

    return {
      id: `project-${Math.random().toString(36).slice(2, 10)}`,
      source: 'manual',
      name,
      path: normalizedPath,
      description: '',
      tags: [],
      client: '',
      projectType: 'other',
      stack: [],
      detectedStack: [],
      favorite: false,
      lastAccessedAt: null,
      createdAt: now,
      updatedAt: now,
      status: 'active',
      quickCommands: [],
      localUrls: [],
      notes: {
        nextStep: '',
        reminders: '',
        claudePrompt: '',
        codexPrompt: '',
        pending: '',
      },
      detectedFiles: [],
      git: {
        isRepo: false,
        branch: null,
        dirty: null,
      },
      pathExists: true,
      workspaceId: '',
      subProjects: [],
    };
  }

  return invoke<ProjectRecord>('inspect_project_path', { path: normalizePath(path) });
}

export async function deleteProject(projectId: string): Promise<AppStore> {
  if (!isTauriRuntime()) {
    const store = loadBrowserStore();
    return saveBrowserStore({
      ...store,
      projects: store.projects.filter((project) => project.id !== projectId),
    });
  }

  return invoke<AppStore>('delete_project', { projectId });
}

export async function saveRootFolder(root: RootFolder): Promise<AppStore> {
  if (!isTauriRuntime()) {
    const store = loadBrowserStore();
    const platform = detectPlatform();
    const normalizedRoot = {
      ...root,
      path: normalizePath(root.path, platform),
    };
    const existingIndex = store.roots.findIndex((item) => item.id === root.id);

    if (existingIndex >= 0) {
      store.roots[existingIndex] = normalizedRoot;
    } else {
      store.roots.unshift(normalizedRoot);
    }

    return saveBrowserStore(store);
  }

  return invoke<AppStore>('save_root_folder', { root });
}

export async function deleteRootFolder(rootId: string): Promise<AppStore> {
  if (!isTauriRuntime()) {
    const store = loadBrowserStore();
    return saveBrowserStore({
      ...store,
      roots: store.roots.filter((root) => root.id !== rootId),
    });
  }

  return invoke<AppStore>('delete_root_folder', { rootId });
}

export async function savePreferences(preferences: Preferences): Promise<AppStore> {
  if (!isTauriRuntime()) {
    const store = loadBrowserStore();
    return saveBrowserStore({
      ...store,
      preferences,
    });
  }

  return invoke<AppStore>('save_preferences', { preferences });
}

export async function runProjectAction(projectId: string, action: ProjectActionPayload): Promise<ActionResult> {
  if (!isTauriRuntime()) {
    return fallbackAction('This action is available only inside the Tauri desktop runtime.');
  }

  return invoke<ActionResult>('run_project_action', { projectId, action });
}
