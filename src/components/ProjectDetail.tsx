import { Copy, ExternalLink, FolderOpen, PenSquare, Play, TerminalSquare, Trash2, X } from 'lucide-react';
import { isBrandKey } from '../app/brandRegistry';
import { getFileManagerLabel, getProjectStatusLabel, getProjectTypeLabel, useI18n } from '../app/i18n';
import type { ProjectActionKind, ProjectRecord, SubProject, ToolIntegration } from '../app/types';
import { formatRelativeDate } from '../utils/formatters';
import { BrandMark } from './BrandMark';
import { TechnologyStack } from './TechnologyStack';

interface ProjectDetailProps {
  project: ProjectRecord | null;
  subProject?: SubProject | null;
  isModal?: boolean;
  onClose?: () => void;
  onEdit: () => void;
  onDelete: (projectId: string) => void;
  onAction: (projectId: string, kind: ProjectActionKind, targetId?: string, pathOverride?: string) => void;
  onSelectSubProject: (parentProjectId: string, subProjectPath: string) => void;
  integrations: ToolIntegration[];
}

export function ProjectDetail({
  project,
  subProject = null,
  isModal = false,
  onClose,
  onEdit,
  onDelete,
  onAction,
  onSelectSubProject,
  integrations,
}: ProjectDetailProps) {
  const { language, platform, t } = useI18n();
  const fileManagerLabel = getFileManagerLabel(platform, t);
  const launchpadIntegrations = integrations.filter((integration) => {
    return integration.installed && (integration.category === 'editor' || integration.category === 'agent');
  });

  if (!project) {
    return (
      <section className="detail-panel detail-panel--empty" aria-live="polite">
        <h2>{t('projectDetailEmptyTitle')}</h2>
        <p>{t('projectDetailEmptyCopy')}</p>
      </section>
    );
  }

  const isSubProject = Boolean(subProject);
  const target = subProject ?? project;
  const actionPathOverride = isSubProject ? target.path : undefined;

  return (
    <section className={`detail-panel ${isModal ? 'detail-panel--modal' : ''}`}>
      <header className="detail-panel__header">
        <div>
          <div className="detail-panel__eyebrow">
            <span className="badge badge--neutral">{getProjectTypeLabel(target.projectType, t)}</span>
            {isSubProject ? <span className="badge badge--neutral">{t('projectDetailSubProjectBadge')}</span> : <span className="badge badge--neutral">{getProjectStatusLabel(project.status, t)}</span>}
            {target.git.isRepo ? <span className="badge badge--neutral">git:{target.git.branch ?? 'detached'}</span> : null}
          </div>
          <h2 id="project-detail-title">{target.name}</h2>
          <p>{target.path}</p>
        </div>

        <div className="detail-panel__header-actions">
          {onClose ? (
            <button type="button" className="button button--ghost" onClick={onClose}>
              <X size={16} />
              {t('actionClose')}
            </button>
          ) : null}
          {!isSubProject ? (
            <>
              <button type="button" className="button button--ghost" onClick={onEdit}>
                <PenSquare size={16} />
                {t('actionEdit')}
              </button>
              <button type="button" className="button button--danger" onClick={() => onDelete(project.id)}>
                <Trash2 size={16} />
                {t('actionDelete')}
              </button>
            </>
          ) : null}
        </div>
      </header>

      <div className="detail-panel__group">
        <h3>{t('projectDetailLaunchpad')}</h3>
        <div className="button-row">
          <button type="button" className="button button--primary" onClick={() => onAction(project.id, 'openTerminal', undefined, actionPathOverride)}>
            <TerminalSquare size={16} />
            {t('actionOpenTerminal')}
          </button>
          {launchpadIntegrations.map((integration) => (
            <button key={integration.id} type="button" className="button button--ghost" onClick={() => onAction(project.id, 'openIntegration', integration.id, actionPathOverride)}>
              <BrandMark brand={isBrandKey(integration.brand) ? integration.brand : 'api'} size={16} />
              {t('actionOpenIntegration', { name: integration.label })}
            </button>
          ))}
          <button type="button" className="button button--ghost" onClick={() => onAction(project.id, 'openFinder', undefined, actionPathOverride)}>
            <FolderOpen size={16} />
            {t('actionOpenFileManager', { manager: fileManagerLabel })}
          </button>
          <button
            type="button"
            className="button button--ghost"
            onClick={() => navigator.clipboard.writeText(target.path)}
          >
            <Copy size={16} />
            {t('actionCopyPath')}
          </button>
        </div>
      </div>

      <div className="detail-panel__grid">
        <section className="surface-card">
          <h3>{t('projectDetailOverview')}</h3>
          <dl className="meta-list">
            <div>
              <dt>{t('projectDetailClient')}</dt>
              <dd>{isSubProject ? t('projectDetailInheritedFrom', { name: project.name }) : project.client || t('projectDetailUnassigned')}</dd>
            </div>
            <div>
              <dt>{t('projectCardStack')}</dt>
              <dd>
                <TechnologyStack stack={target.stack} />
              </dd>
            </div>
            <div>
              <dt>{t('projectDetailTags')}</dt>
              <dd>{isSubProject ? t('projectDetailNoTags') : project.tags.join(', ') || t('projectDetailNoTags')}</dd>
            </div>
            <div>
              <dt>{t('projectDetailLastAccess')}</dt>
              <dd>{formatRelativeDate(project.lastAccessedAt, language)}</dd>
            </div>
          </dl>
          <p className="surface-card__description">{isSubProject ? t('projectDetailSubProjectCopy') : project.description || t('projectDetailNoDescription')}</p>
        </section>

        <section className="surface-card">
          <h3>{t('projectDetailDetectedFiles')}</h3>
          <div className="pill-list">
            {target.detectedFiles.length > 0 ? target.detectedFiles.map((file) => <span key={file} className="pill">{file}</span>) : <span className="muted-copy">{t('projectDetailNoMarkers')}</span>}
          </div>
        </section>
      </div>

      {!isSubProject ? (
        <>
          <section className="surface-card">
            <div className="surface-card__header">
              <h3>{t('projectDetailLocalUrls')}</h3>
            </div>
            <div className="stack-list">
              {project.localUrls.length > 0 ? (
                project.localUrls.map((item) => (
                  <button key={item.id} type="button" className="list-action" onClick={() => onAction(project.id, 'openLocalUrl', item.id)}>
                    <div>
                      <strong>{item.label}</strong>
                      <span>{item.url}</span>
                    </div>
                    <ExternalLink size={16} />
                  </button>
                ))
              ) : (
                <p className="muted-copy">{t('projectDetailNoLocalUrls')}</p>
              )}
            </div>
          </section>

          <section className="surface-card">
            <div className="surface-card__header">
              <h3>{t('projectDetailQuickCommands')}</h3>
            </div>
            <div className="stack-list">
              {project.quickCommands.length > 0 ? (
                project.quickCommands.map((command) => (
                  <button key={command.id} type="button" className="list-action" onClick={() => onAction(project.id, 'runQuickCommand', command.id)}>
                    <div>
                      <strong>{command.name}</strong>
                      <span>{command.command}</span>
                    </div>
                    <Play size={16} />
                  </button>
                ))
              ) : (
                <p className="muted-copy">{t('projectDetailNoQuickCommands')}</p>
              )}
            </div>
          </section>
        </>
      ) : null}

      {!isSubProject && project.subProjects.length > 0 ? (
        <section className="surface-card">
          <h3>{t('projectDetailSubProjects')}</h3>
          <div className="stack-list">
            {project.subProjects.map((sub) => (
              <button key={sub.path} type="button" className="list-card list-card--button" onClick={() => onSelectSubProject(project.id, sub.path)} aria-label={t('projectDetailOpenSubProjectAria', { name: sub.name })}>
                <div>
                  <strong>{sub.name}</strong>
                  <div className="list-card__stack">
                    <span className="list-card__meta">{getProjectTypeLabel(sub.projectType as typeof project.projectType, t)}</span>
                    <TechnologyStack stack={sub.stack} size="sm" />
                  </div>
                </div>
                {sub.git.isRepo ? <span className="badge badge--neutral">git:{sub.git.branch ?? 'detached'}</span> : null}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {!isSubProject ? (
        <section className="surface-card">
          <h3>{t('projectDetailNotes')}</h3>
          <div className="notes-grid">
            <div>
              <h4>{t('projectDetailNextStep')}</h4>
              <p>{project.notes.nextStep || t('projectDetailNoNextStep')}</p>
            </div>
            <div>
              <h4>{t('projectDetailReminders')}</h4>
              <p>{project.notes.reminders || t('projectDetailNoReminders')}</p>
            </div>
            <div>
              <h4>{t('projectDetailClaudePrompt')}</h4>
              <p>{project.notes.claudePrompt || t('projectDetailNoPrompt')}</p>
            </div>
            <div>
              <h4>{t('projectDetailCodexPrompt')}</h4>
              <p>{project.notes.codexPrompt || t('projectDetailNoPrompt')}</p>
            </div>
            <div className="notes-grid__wide">
              <h4>{t('projectDetailPending')}</h4>
              <p>{project.notes.pending || t('projectDetailNoPending')}</p>
            </div>
          </div>
        </section>
      ) : null}
    </section>
  );
}
