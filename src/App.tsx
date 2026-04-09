import { useEffect, useState } from 'react';
import { Plus, RefreshCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import { I18nProvider, getFileManagerLabel, getProjectStatusLabel, getProjectTypeLabel, getViewLabel, useI18n } from './app/i18n';
import { PROJECT_STATUSES, PROJECT_TYPES, type ProjectRecord, type RootFolder, type RootFolderPreview } from './app/types';
import { OnboardingView } from './components/OnboardingView';
import { ProjectCard } from './components/ProjectCard';
import { ProjectDetailModal } from './components/ProjectDetailModal';
import { ProjectFormModal } from './components/ProjectFormModal';
import { ProjectTable } from './components/ProjectTable';
import { RootFoldersView } from './components/RootFoldersView';
import { RootStructureReview } from './components/RootStructureReview';
import { SettingsView } from './components/SettingsView';
import { Sidebar } from './components/Sidebar';
import { SplashScreen } from './components/SplashScreen';
import { useProjectHub } from './hooks/useProjectHub';
import { inspectProjectPath, pickProjectFolder, pickRootFolder, previewRootFolder } from './services/desktopApi';
import { createId } from './utils/formatters';
import { getComparablePath } from './utils/paths';

function AppFrame({ hub }: { hub: ReturnType<typeof useProjectHub> }) {
  const { platform, t } = useI18n();
  const [isProjectModalOpen, setProjectModalOpen] = useState(false);
  const [isProjectDetailOpen, setProjectDetailOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectRecord | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [onboardingPreview, setOnboardingPreview] = useState<RootFolderPreview | null>(null);
  const [reviewRoot, setReviewRoot] = useState<RootFolder | null>(null);
  const [reviewPreview, setReviewPreview] = useState<RootFolderPreview | null>(null);
  const [isStructureModalOpen, setStructureModalOpen] = useState(false);

  function openManualProject(): void {
    setEditingProject(null);
    setProjectModalOpen(true);
  }

  function updatePreviewKind(
    preview: RootFolderPreview | null,
    setPreview: (value: RootFolderPreview | null) => void,
    path: string,
    kind: RootFolderPreview['children'][number]['currentKind'],
  ): void {
    if (!preview) {
      return;
    }

    setPreview({
      ...preview,
      children: preview.children.map((child) => (child.path === path ? { ...child, currentKind: kind } : child)),
    });
  }

  async function openCreateProject(): Promise<void> {
    let selectedPath: string | null = null;

    try {
      selectedPath = await pickProjectFolder();
    } catch {
      hub.showStatus({
        ok: false,
        message: t('statusErrorFolderPicker'),
      });
      return;
    }

    if (!selectedPath) {
      return;
    }

    handleChangeView('catalog');

    const comparableSelectedPath = getComparablePath(selectedPath, platform);
    const existingProject = hub.store.projects.find((project) => getComparablePath(project.path, platform) === comparableSelectedPath);

    if (existingProject) {
      hub.setSelectedProjectId(existingProject.id);
      setProjectDetailOpen(true);
      hub.showStatus({
        ok: true,
        message: t('statusSuccessExisting', { name: existingProject.name }),
      });
      return;
    }

    let importedProject: ProjectRecord;

    try {
      importedProject = await inspectProjectPath(selectedPath);
    } catch {
      hub.showStatus({
        ok: false,
        message: t('statusErrorImportProject'),
      });
      return;
    }

    try {
      await hub.persistProject(importedProject, {
        successMessage: t('statusSuccessImported', {
          name: importedProject.name,
          manager: getFileManagerLabel(platform, t),
        }),
      });
      hub.setSelectedProjectId(importedProject.id);
      setProjectDetailOpen(true);
    } catch {
      // `persistProject` already reports a localized banner.
    }
  }

  async function handlePickOnboardingRoot(): Promise<void> {
    let selectedPath: string | null = null;

    try {
      selectedPath = await pickRootFolder();
    } catch {
      hub.showStatus({
        ok: false,
        message: t('statusErrorFolderPicker'),
      });
      return;
    }

    if (!selectedPath) {
      return;
    }

    try {
      const preview = await previewRootFolder(selectedPath);
      setOnboardingPreview(preview);
    } catch {
      hub.showStatus({
        ok: false,
        message: t('statusErrorPreviewRoot'),
      });
    }
  }

  async function handleConfirmOnboarding(): Promise<void> {
    if (!onboardingPreview) {
      return;
    }

    const root: RootFolder = {
      id: createId('root'),
      path: onboardingPreview.path,
      label: onboardingPreview.suggestedLabel,
      maxDepth: hub.store.preferences.rootScanDepth,
      createdAt: new Date().toISOString(),
      childRules: onboardingPreview.children.map((child) => ({
        path: child.path,
        kind: child.currentKind,
      })),
    };

    await hub.completeOnboarding(root);
    setOnboardingPreview(null);
  }

  async function handleOpenStructureReview(root: RootFolder): Promise<void> {
    try {
      const preview = await previewRootFolder(root.path, root.childRules);
      setReviewRoot(root);
      setReviewPreview(preview);
      setStructureModalOpen(true);
    } catch {
      hub.showStatus({
        ok: false,
        message: t('statusErrorPreviewRoot'),
      });
    }
  }

  async function handleSaveStructureReview(): Promise<void> {
    if (!reviewRoot || !reviewPreview) {
      return;
    }

    await hub.persistRoot({
      ...reviewRoot,
      childRules: reviewPreview.children.map((child) => ({
        path: child.path,
        kind: child.currentKind,
      })),
    });
    setStructureModalOpen(false);
    setReviewRoot(null);
    setReviewPreview(null);
  }

  function handleChangeView(view: typeof hub.currentView): void {
    setProjectDetailOpen(false);
    hub.setCurrentView(view);
  }

  function openEditProject(): void {
    if (!hub.selectedProject) {
      return;
    }

    setProjectDetailOpen(false);
    setEditingProject(hub.selectedProject);
    setProjectModalOpen(true);
  }

  function handleSelectProject(projectId: string): void {
    hub.setSelectedProjectId(projectId);
    setProjectDetailOpen(true);
  }

  async function handleDeleteProject(projectId: string): Promise<void> {
    setProjectDetailOpen(false);
    await hub.removeProject(projectId);
  }

  useEffect(() => {
    document.documentElement.dataset.theme = hub.store.preferences.theme;
    document.documentElement.style.colorScheme = hub.store.preferences.theme;
  }, [hub.store.preferences.theme]);

  if (hub.requiresOnboarding) {
    return (
      <>
        <SplashScreen isLoading={hub.isLoading} />
        <main className="onboarding-frame">
          {hub.statusMessage ? (
            <div className={`toast ${hub.statusMessage.ok ? 'toast--success' : 'toast--error'}`} aria-live="polite">
              <span>{hub.statusMessage.message}</span>
            </div>
          ) : null}

          <OnboardingView
            isBusy={hub.isSaving}
            preview={onboardingPreview}
            onPickRoot={handlePickOnboardingRoot}
            onConfirm={handleConfirmOnboarding}
            onKindChange={(path, kind) => updatePreviewKind(onboardingPreview, setOnboardingPreview, path, kind)}
          />
        </main>
      </>
    );
  }

  return (
    <>
      <SplashScreen isLoading={hub.isLoading} />
      <div className={`app-shell ${sidebarCollapsed ? 'app-shell--collapsed' : ''}`}>
        <Sidebar
          currentView={hub.currentView}
          collapsed={sidebarCollapsed}
          onChange={handleChangeView}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        />

      <main className="main-layout">
        <header className="topbar">
          <div>
            <p className="sidebar__eyebrow">{t('appTitle')}</p>
            <h2>{getViewLabel(hub.currentView, t)}</h2>
          </div>

          <div className="topbar__actions">
            <button type="button" className="button button--ghost" onClick={() => void hub.refreshScan()}>
              <RefreshCcw size={16} />
              {t('actionScan')}
            </button>
            <button type="button" className="button button--ghost" onClick={openManualProject}>
              {t('actionAddManually')}
            </button>
            <button type="button" className="button button--primary" onClick={() => void openCreateProject()}>
              <Plus size={16} />
              {t('actionAddProject')}
            </button>
          </div>
        </header>

        {hub.statusMessage ? (
          <div className={`toast ${hub.statusMessage.ok ? 'toast--success' : 'toast--error'}`}>
            <span>{hub.statusMessage.message}</span>
          </div>
        ) : null}

        {hub.currentView === 'catalog' ? (
          <section className="catalog-shell">
            {hub.workspaces.length > 0 ? (
              <nav className="workspace-tabs">
                <button
                  type="button"
                  className={`workspace-tab ${!hub.activeWorkspace ? 'workspace-tab--active' : ''}`}
                  onClick={() => hub.setActiveWorkspace('')}
                >
                  {t('workspaceAll')}
                </button>
                {hub.workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    type="button"
                    className={`workspace-tab ${hub.activeWorkspace === ws.id ? 'workspace-tab--active' : ''}`}
                    onClick={() => hub.setActiveWorkspace(ws.id)}
                  >
                    {ws.name}
                  </button>
                ))}
              </nav>
            ) : null}

            <section className="surface-card toolbar-card">
              <div className="toolbar-row">
                <label className="search-field">
                  <Search size={16} />
                  <input
                    value={hub.filters.query}
                    onChange={(event) => hub.setFilters((current) => ({ ...current, query: event.target.value }))}
                    placeholder={t('searchPlaceholder')}
                  />
                </label>

                <button
                  type="button"
                  className={`button ${hub.store.preferences.catalogLayout === 'grid' ? 'button--primary' : 'button--ghost'}`}
                  onClick={() => void hub.persistPreferences({ ...hub.store.preferences, catalogLayout: 'grid' })}
                >
                  {t('layoutGrid')}
                </button>
                <button
                  type="button"
                  className={`button ${hub.store.preferences.catalogLayout === 'list' ? 'button--primary' : 'button--ghost'}`}
                  onClick={() => void hub.persistPreferences({ ...hub.store.preferences, catalogLayout: 'list' })}
                >
                  {t('layoutList')}
                </button>
              </div>

              <div className="toolbar-filters">
                <label className="field">
                  <span>
                    <SlidersHorizontal size={14} />
                    {t('filterClient')}
                  </span>
                  <select
                    value={hub.filters.client}
                    onChange={(event) => hub.setFilters((current) => ({ ...current, client: event.target.value }))}
                  >
                    <option value="">{t('filterAll')}</option>
                    {hub.clients.map((client) => (
                      <option key={client} value={client}>
                        {client}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>{t('filterType')}</span>
                  <select
                    value={hub.filters.projectType}
                    onChange={(event) =>
                      hub.setFilters((current) => ({ ...current, projectType: event.target.value as typeof current.projectType }))
                    }
                  >
                    <option value="all">{t('filterAll')}</option>
                    {PROJECT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {getProjectTypeLabel(type, t)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>{t('filterStack')}</span>
                  <select
                    value={hub.filters.stack}
                    onChange={(event) => hub.setFilters((current) => ({ ...current, stack: event.target.value }))}
                  >
                    <option value="">{t('filterAll')}</option>
                    {hub.stacks.map((stack) => (
                      <option key={stack} value={stack}>
                        {stack}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>{t('filterStatus')}</span>
                  <select
                    value={hub.filters.status}
                    onChange={(event) =>
                      hub.setFilters((current) => ({ ...current, status: event.target.value as typeof current.status }))
                    }
                  >
                    <option value="all">{t('filterAll')}</option>
                    {PROJECT_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {getProjectStatusLabel(status, t)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="checkbox checkbox--toolbar">
                  <input
                    type="checkbox"
                    checked={hub.filters.onlyFavorites}
                    onChange={(event) => hub.setFilters((current) => ({ ...current, onlyFavorites: event.target.checked }))}
                  />
                  <span>{t('filterFavoritesOnly')}</span>
                </label>
              </div>
            </section>

            {hub.visibleProjects.length === 0 ? (
              <article className="surface-card catalog-empty" aria-live="polite">
                <h3>{t('catalogEmptyTitle')}</h3>
                <p className="muted-copy">{t('catalogEmptyCopy')}</p>
              </article>
            ) : hub.store.preferences.catalogLayout === 'grid' ? (
                <div className="project-grid">
                  {hub.visibleProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      isSelected={isProjectDetailOpen && project.id === hub.selectedProjectId}
                      onSelect={handleSelectProject}
                      onAction={(projectId, kind) => void hub.executeProjectAction(projectId, kind)}
                    />
                  ))}
                </div>
            ) : (
              <ProjectTable
                projects={hub.visibleProjects}
                selectedProjectId={isProjectDetailOpen ? hub.selectedProjectId : null}
                onSelect={handleSelectProject}
              />
            )}
          </section>
        ) : null}

        {hub.currentView === 'roots' ? (
          <RootFoldersView
            roots={hub.store.roots}
            defaultDepth={hub.store.preferences.rootScanDepth}
            onSave={hub.persistRoot}
            onDelete={hub.removeRoot}
            onRescan={hub.refreshScan}
            onReview={(root) => void handleOpenStructureReview(root)}
          />
        ) : null}

        {hub.currentView === 'settings' ? (
          <SettingsView preferences={hub.store.preferences} onSave={hub.persistPreferences} />
        ) : null}
      </main>

      <ProjectFormModal
        project={editingProject}
        isOpen={isProjectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        onSubmit={hub.persistProject}
      />

      <ProjectDetailModal
        project={hub.selectedProject}
        isOpen={isProjectDetailOpen}
        onClose={() => setProjectDetailOpen(false)}
        onEdit={openEditProject}
        onDelete={(projectId) => void handleDeleteProject(projectId)}
        onAction={(projectId, kind, targetId) => void hub.executeProjectAction(projectId, kind, targetId)}
      />

      {isStructureModalOpen && reviewPreview ? (
        <div className="modal-backdrop" role="presentation">
          <div className="modal modal--structure" role="dialog" aria-modal="true" aria-labelledby="root-structure-title">
            <div className="modal__header">
              <div>
                <p className="sidebar__eyebrow">{t('rootsReviewStructure')}</p>
                <h2 id="root-structure-title">{reviewRoot?.label || t('rootsReviewTitle')}</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => {
                  setStructureModalOpen(false);
                  setReviewRoot(null);
                  setReviewPreview(null);
                }}
                aria-label={t('actionClose')}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal__body">
              <RootStructureReview
                preview={reviewPreview}
                title={t('rootsReviewTitle')}
                description={t('rootsReviewCopy')}
                emptyCopy={t('rootsReviewEmpty')}
                onKindChange={(path, kind) => updatePreviewKind(reviewPreview, setReviewPreview, path, kind)}
              />
            </div>

            <div className="modal__footer">
              <button
                type="button"
                className="button button--ghost"
                onClick={() => {
                  setStructureModalOpen(false);
                  setReviewRoot(null);
                  setReviewPreview(null);
                }}
              >
                {t('actionClose')}
              </button>
              <button type="button" className="button button--primary" onClick={() => void handleSaveStructureReview()}>
                {t('actionSaveRootFolder')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
    </>
  );
}

export default function App() {
  const hub = useProjectHub();

  return (
    <I18nProvider languagePreference={hub.store.preferences.language ?? 'system'}>
      <AppFrame hub={hub} />
    </I18nProvider>
  );
}
