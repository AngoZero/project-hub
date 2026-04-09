import { Clock3, FolderSync, Star, TerminalSquare } from 'lucide-react';
import { useI18n, getProjectStatusLabel } from '../app/i18n';
import type { ProjectRecord } from '../app/types';
import { formatRelativeDate } from '../utils/formatters';
import { BrandMark } from './BrandMark';
import { TechnologyStack } from './TechnologyStack';

interface DashboardViewProps {
  projects: ProjectRecord[];
  rootCount: number;
  onSelect: (projectId: string) => void;
  onAction: (projectId: string, kind: 'openTerminal' | 'openCode' | 'openClaude') => void;
}

export function DashboardView({ projects, rootCount, onSelect, onAction }: DashboardViewProps) {
  const { language, t } = useI18n();
  const favorites = projects.filter((project) => project.favorite).slice(0, 4);
  const recent = [...projects]
    .sort((left, right) => (Date.parse(right.lastAccessedAt ?? '') || 0) - (Date.parse(left.lastAccessedAt ?? '') || 0))
    .slice(0, 6);

  return (
    <section className="dashboard">
      <div className="hero-card">
        <div>
          <p className="sidebar__eyebrow">{t('dashboardEyebrow')}</p>
          <h2>{t('dashboardTitle')}</h2>
          <p className="hero-card__copy">
            {t('dashboardCopy')}
          </p>
        </div>
        <div className="hero-card__stats">
          <div>
            <strong>{projects.length}</strong>
            <span>{t('dashboardProjectsTracked')}</span>
          </div>
          <div>
            <strong>{rootCount}</strong>
            <span>{t('dashboardRootFolders')}</span>
          </div>
        </div>
      </div>

      <div className="dashboard__grid">
        <section className="surface-card">
          <div className="surface-card__header">
            <h3>
              <Star size={16} />
              {t('dashboardFavorites')}
            </h3>
          </div>
          <div className="stack-list">
            {favorites.length > 0 ? (
              favorites.map((project) => (
                <button key={project.id} type="button" className="list-action" onClick={() => onSelect(project.id)}>
                  <div>
                    <strong>{project.name}</strong>
                    <TechnologyStack stack={project.stack} size="sm" />
                  </div>
                  <TerminalSquare size={16} />
                </button>
              ))
            ) : (
              <p className="muted-copy">{t('dashboardFavoritesEmpty')}</p>
            )}
          </div>
        </section>

        <section className="surface-card">
          <div className="surface-card__header">
            <h3>
              <Clock3 size={16} />
              {t('dashboardRecentActivity')}
            </h3>
          </div>
          <div className="stack-list">
            {recent.length > 0 ? (
              recent.map((project) => (
                <button key={project.id} type="button" className="list-action" onClick={() => onSelect(project.id)}>
                  <div>
                    <strong>{project.name}</strong>
                    <span>{t('dashboardLastAccess', { value: formatRelativeDate(project.lastAccessedAt, language) })}</span>
                  </div>
                  <span className="badge badge--neutral">{getProjectStatusLabel(project.status, t)}</span>
                </button>
              ))
            ) : (
              <p className="muted-copy">{t('dashboardRecentEmpty')}</p>
            )}
          </div>
        </section>
      </div>

      <section className="surface-card">
        <div className="surface-card__header">
            <h3>
              <FolderSync size={16} />
              {t('dashboardLaunch')}
            </h3>
          </div>
        <div className="dashboard__quick-grid">
          {recent.slice(0, 3).map((project) => (
            <article key={project.id} className="mini-card">
              <div>
                <strong>{project.name}</strong>
                <span>{project.path}</span>
              </div>
              <div className="button-row">
                <button type="button" className="button button--ghost" onClick={() => onAction(project.id, 'openTerminal')}>
                  {t('actionTerminal')}
                </button>
                <button type="button" className="button button--ghost" onClick={() => onAction(project.id, 'openCode')}>
                  <BrandMark brand="vscode" size={16} />
                  VS Code
                </button>
                <button type="button" className="button button--ghost" onClick={() => onAction(project.id, 'openClaude')}>
                  <BrandMark brand="claude" size={16} />
                  Claude
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
