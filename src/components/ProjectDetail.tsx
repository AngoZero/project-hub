import { Copy, ExternalLink, FolderOpen, PenSquare, Play, TerminalSquare, Trash2, X } from 'lucide-react';
import { getFileManagerLabel, getProjectStatusLabel, getProjectTypeLabel, useI18n } from '../app/i18n';
import type { ProjectRecord } from '../app/types';
import { formatRelativeDate } from '../utils/formatters';
import { BrandMark } from './BrandMark';
import { TechnologyStack } from './TechnologyStack';

interface ProjectDetailProps {
  project: ProjectRecord | null;
  isModal?: boolean;
  onClose?: () => void;
  onEdit: () => void;
  onDelete: (projectId: string) => void;
  onAction: (projectId: string, kind: 'openFinder' | 'openCode' | 'openTerminal' | 'openClaude' | 'openCodex' | 'openLocalUrl' | 'runQuickCommand', targetId?: string) => void;
}

export function ProjectDetail({ project, isModal = false, onClose, onEdit, onDelete, onAction }: ProjectDetailProps) {
  const { language, platform, t } = useI18n();
  const fileManagerLabel = getFileManagerLabel(platform, t);

  if (!project) {
    return (
      <section className="detail-panel detail-panel--empty" aria-live="polite">
        <h2>{t('projectDetailEmptyTitle')}</h2>
        <p>{t('projectDetailEmptyCopy')}</p>
      </section>
    );
  }

  return (
    <section className={`detail-panel ${isModal ? 'detail-panel--modal' : ''}`}>
      <header className="detail-panel__header">
        <div>
          <div className="detail-panel__eyebrow">
            <span className="badge badge--neutral">{getProjectTypeLabel(project.projectType, t)}</span>
            <span className="badge badge--neutral">{getProjectStatusLabel(project.status, t)}</span>
            {project.git.isRepo ? <span className="badge badge--neutral">git:{project.git.branch ?? 'detached'}</span> : null}
          </div>
          <h2 id="project-detail-title">{project.name}</h2>
          <p>{project.path}</p>
        </div>

        <div className="detail-panel__header-actions">
          {onClose ? (
            <button type="button" className="button button--ghost" onClick={onClose}>
              <X size={16} />
              {t('actionClose')}
            </button>
          ) : null}
          <button type="button" className="button button--ghost" onClick={onEdit}>
            <PenSquare size={16} />
            {t('actionEdit')}
          </button>
          <button type="button" className="button button--danger" onClick={() => onDelete(project.id)}>
            <Trash2 size={16} />
            {t('actionDelete')}
          </button>
        </div>
      </header>

      <div className="detail-panel__group">
        <h3>{t('projectDetailLaunchpad')}</h3>
        <div className="button-row">
          <button type="button" className="button button--primary" onClick={() => onAction(project.id, 'openTerminal')}>
            <TerminalSquare size={16} />
            {t('actionOpenTerminal')}
          </button>
          <button type="button" className="button button--ghost" onClick={() => onAction(project.id, 'openClaude')}>
            <BrandMark brand="claude" size={16} />
            {t('actionOpenClaude')}
          </button>
          <button type="button" className="button button--ghost" onClick={() => onAction(project.id, 'openCodex')}>
            <BrandMark brand="codex" size={16} />
            {t('actionOpenCodex')}
          </button>
          <button type="button" className="button button--ghost" onClick={() => onAction(project.id, 'openCode')}>
            <BrandMark brand="vscode" size={16} />
            {t('actionOpenVsCode')}
          </button>
          <button type="button" className="button button--ghost" onClick={() => onAction(project.id, 'openFinder')}>
            <FolderOpen size={16} />
            {t('actionOpenFileManager', { manager: fileManagerLabel })}
          </button>
          <button
            type="button"
            className="button button--ghost"
            onClick={() => navigator.clipboard.writeText(project.path)}
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
              <dd>{project.client || t('projectDetailUnassigned')}</dd>
            </div>
            <div>
              <dt>{t('projectCardStack')}</dt>
              <dd>
                <TechnologyStack stack={project.stack} />
              </dd>
            </div>
            <div>
              <dt>{t('projectDetailTags')}</dt>
              <dd>{project.tags.join(', ') || t('projectDetailNoTags')}</dd>
            </div>
            <div>
              <dt>{t('projectDetailLastAccess')}</dt>
              <dd>{formatRelativeDate(project.lastAccessedAt, language)}</dd>
            </div>
          </dl>
          <p className="surface-card__description">{project.description || t('projectDetailNoDescription')}</p>
        </section>

        <section className="surface-card">
          <h3>{t('projectDetailDetectedFiles')}</h3>
          <div className="pill-list">
            {project.detectedFiles.length > 0 ? project.detectedFiles.map((file) => <span key={file} className="pill">{file}</span>) : <span className="muted-copy">{t('projectDetailNoMarkers')}</span>}
          </div>
        </section>
      </div>

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

      {project.subProjects.length > 0 ? (
        <section className="surface-card">
          <h3>{t('projectDetailSubProjects')}</h3>
          <div className="stack-list">
            {project.subProjects.map((sub) => (
              <div key={sub.path} className="list-card">
                <div>
                  <strong>{sub.name}</strong>
                  <div className="list-card__stack">
                    <span className="list-card__meta">{getProjectTypeLabel(sub.projectType as typeof project.projectType, t)}</span>
                    <TechnologyStack stack={sub.stack} size="sm" />
                  </div>
                </div>
                {sub.git.isRepo ? <span className="badge badge--neutral">git:{sub.git.branch ?? 'detached'}</span> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

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
    </section>
  );
}
