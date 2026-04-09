import { useEffect, useMemo, useState } from 'react';
import { buildSampleProjects, FALLBACK_STORE } from '../app/demoData';
import { resolveLanguagePreference, translate, type TranslationKey } from '../app/i18n';
import type { ActionResult, AppStore, CatalogFilters, NavItem, Preferences, ProjectRecord, RootFolder } from '../app/types';
import { deleteProject, deleteRootFolder, loadAppStore, runProjectAction, savePreferences, saveProject, saveRootFolder, scanProjects } from '../services/desktopApi';
import { filterProjects, sortProjects } from '../utils/projectFilters';

const INITIAL_FILTERS: CatalogFilters = {
  query: '',
  onlyFavorites: false,
  client: '',
  projectType: 'all',
  stack: '',
  status: 'all',
  workspace: '',
};

interface PersistProjectOptions {
  successMessage?: string;
}

function getErrorMessage(
  language: ReturnType<typeof resolveLanguagePreference>,
  error: unknown,
  fallbackKey: TranslationKey,
): string {
  if (error instanceof Error) {
    if (error.message === 'DUPLICATE_PROJECT_PATH') {
      return translate(language, 'statusErrorDuplicatePath');
    }

    if (error.message.trim()) {
      return error.message;
    }
  }
  return translate(language, fallbackKey);
}

export function useProjectHub() {
  const [store, setStore] = useState<AppStore>(FALLBACK_STORE);
  const [currentView, setCurrentView] = useState<NavItem>('catalog');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [filters, setFilters] = useState<CatalogFilters>(INITIAL_FILTERS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<ActionResult | null>(null);

  useEffect(() => {
    if (!statusMessage) return;
    const timer = setTimeout(() => setStatusMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [statusMessage]);

  const resolvedLanguage = useMemo(
    () => resolveLanguagePreference(store.preferences.language ?? 'system'),
    [store.preferences.language],
  );

  useEffect(() => {
    let isActive = true;

    async function initialize(): Promise<void> {
      setIsLoading(true);
      try {
        const nextStore = await loadAppStore();
        if (!isActive) {
          return;
        }
        setStore(nextStore);
        setSelectedProjectId((current) => current ?? nextStore.projects[0]?.id ?? null);
      } catch (error) {
        if (!isActive) {
          return;
        }
        const message = error instanceof Error && error.message.trim()
          ? error.message
          : translate(resolvedLanguage, 'statusErrorLoadStore');
        setStatusMessage({ ok: false, message });
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void initialize();

    return () => {
      isActive = false;
    };
  }, [resolvedLanguage]);

  const visibleProjects = useMemo(() => {
    const baseProjects = store.preferences.showArchived
      ? store.projects
      : store.projects.filter((project) => project.status !== 'archived');

    const filtered = filterProjects(baseProjects, filters);
    return sortProjects(filtered, store.preferences.sortBy);
  }, [filters, store.preferences.showArchived, store.preferences.sortBy, store.projects]);

  const selectedProject = useMemo(
    () => visibleProjects.find((project) => project.id === selectedProjectId) ?? store.projects.find((project) => project.id === selectedProjectId) ?? null,
    [selectedProjectId, store.projects, visibleProjects],
  );

  const sampleProjects = useMemo(
    () => (store.projects.length === 0 ? buildSampleProjects(resolvedLanguage) : []),
    [resolvedLanguage, store.projects.length],
  );

  const workspaces = useMemo(() => store.workspaces ?? [], [store.workspaces]);

  function setActiveWorkspace(workspaceId: string): void {
    setFilters((current) => ({ ...current, workspace: workspaceId }));
  }

  const clients = useMemo(
    () =>
      Array.from(new Set(store.projects.map((project) => project.client).filter(Boolean))).sort((left, right) =>
        left.localeCompare(right),
      ),
    [store.projects],
  );

  const stacks = useMemo(
    () =>
      Array.from(new Set(store.projects.flatMap((project) => project.stack).filter(Boolean))).sort((left, right) =>
        left.localeCompare(right),
      ),
    [store.projects],
  );

  const stats = useMemo(() => {
    const favoriteCount = store.projects.filter((project) => project.favorite).length;
    const activeCount = store.projects.filter((project) => project.status === 'active').length;
    const rootCount = store.roots.length;

    return {
      totalProjects: store.projects.length,
      favoriteCount,
      activeCount,
      rootCount,
    };
  }, [store.projects, store.roots.length]);

  async function persistProject(project: ProjectRecord, options?: PersistProjectOptions): Promise<void> {
    setIsSaving(true);
    try {
      const nextStore = await saveProject(project);
      setStore(nextStore);
      setSelectedProjectId(project.id);
      setStatusMessage({
        ok: true,
        message: options?.successMessage ?? translate(resolvedLanguage, 'statusSuccessProjectSaved', { name: project.name }),
      });
    } catch (error) {
      setStatusMessage({ ok: false, message: getErrorMessage(resolvedLanguage, error, 'statusErrorSaveProject') });
      throw error;
    } finally {
      setIsSaving(false);
    }
  }

  async function removeProject(projectId: string): Promise<void> {
    setIsSaving(true);
    try {
      const nextStore = await deleteProject(projectId);
      setStore(nextStore);
      setSelectedProjectId((current) => (current === projectId ? nextStore.projects[0]?.id ?? null : current));
      setStatusMessage({ ok: true, message: translate(resolvedLanguage, 'statusSuccessProjectRemoved') });
    } catch (error) {
      setStatusMessage({ ok: false, message: getErrorMessage(resolvedLanguage, error, 'statusErrorRemoveProject') });
    } finally {
      setIsSaving(false);
    }
  }

  async function persistRoot(root: RootFolder): Promise<void> {
    setIsSaving(true);
    try {
      const nextStore = await saveRootFolder(root);
      setStore(nextStore);
      setStatusMessage({ ok: true, message: translate(resolvedLanguage, 'statusSuccessRootSaved') });
    } catch (error) {
      setStatusMessage({ ok: false, message: getErrorMessage(resolvedLanguage, error, 'statusErrorSaveRoot') });
    } finally {
      setIsSaving(false);
    }
  }

  async function removeRoot(rootId: string): Promise<void> {
    setIsSaving(true);
    try {
      const nextStore = await deleteRootFolder(rootId);
      setStore(nextStore);
      setStatusMessage({ ok: true, message: translate(resolvedLanguage, 'statusSuccessRootRemoved') });
    } catch (error) {
      setStatusMessage({ ok: false, message: getErrorMessage(resolvedLanguage, error, 'statusErrorRemoveRoot') });
    } finally {
      setIsSaving(false);
    }
  }

  async function persistPreferences(preferences: Preferences): Promise<void> {
    setIsSaving(true);
    try {
      const nextStore = await savePreferences(preferences);
      setStore(nextStore);
      setStatusMessage({ ok: true, message: translate(resolvedLanguage, 'statusSuccessPreferences') });
    } catch (error) {
      setStatusMessage({ ok: false, message: getErrorMessage(resolvedLanguage, error, 'statusErrorPreferences') });
    } finally {
      setIsSaving(false);
    }
  }

  async function refreshScan(): Promise<void> {
    setIsSaving(true);
    try {
      const nextStore = await scanProjects();
      setStore(nextStore);
      setSelectedProjectId((current) => current ?? nextStore.projects[0]?.id ?? null);
      setStatusMessage({ ok: true, message: translate(resolvedLanguage, 'statusSuccessScan') });
    } catch (error) {
      setStatusMessage({ ok: false, message: getErrorMessage(resolvedLanguage, error, 'statusErrorScan') });
    } finally {
      setIsSaving(false);
    }
  }

  async function executeProjectAction(
    projectId: string,
    kind: 'openFinder' | 'openCode' | 'openTerminal' | 'openClaude' | 'openCodex' | 'openLocalUrl' | 'runQuickCommand',
    targetId?: string,
  ): Promise<void> {
    const result = await runProjectAction(projectId, { kind, targetId, language: resolvedLanguage });
    setStatusMessage(result);
    if (result.ok) {
      const nextStore = await loadAppStore();
      setStore(nextStore);
    }
  }

  function showStatus(result: ActionResult): void {
    setStatusMessage(result);
  }

  function clearStatus(): void {
    setStatusMessage(null);
  }

  return {
    store,
    currentView,
    setCurrentView,
    selectedProjectId,
    setSelectedProjectId,
    selectedProject,
    filters,
    setFilters,
    visibleProjects,
    sampleProjects,
    workspaces,
    activeWorkspace: filters.workspace,
    setActiveWorkspace,
    clients,
    stacks,
    stats,
    isLoading,
    isSaving,
    statusMessage,
    clearStatus,
    showStatus,
    persistProject,
    removeProject,
    persistRoot,
    removeRoot,
    persistPreferences,
    refreshScan,
    executeProjectAction,
    resolvedLanguage,
  };
}
