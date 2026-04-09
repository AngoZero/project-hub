import { Folder, Star, TerminalSquare } from 'lucide-react';
import clsx from 'clsx';
import { getFileManagerLabel, getProjectStatusLabel, getProjectTypeLabel, useI18n } from '../app/i18n';
import type { ProjectRecord } from '../app/types';
import { formatRelativeDate } from '../utils/formatters';
import { BrandMark } from './BrandMark';
import { TechnologyStack } from './TechnologyStack';

interface ProjectCardProps {
  project: ProjectRecord;
  isSelected: boolean;
  onSelect: (projectId: string) => void;
  onAction: (projectId: string, kind: 'openTerminal' | 'openCode' | 'openFinder') => void;
}

export function ProjectCard({ project, isSelected, onSelect, onAction }: ProjectCardProps) {
  const { language, platform, t } = useI18n();
  const description = project.description || t('projectCardNoDescription');
  const fileManagerLabel = getFileManagerLabel(platform, t);

  return (
    <article
      className={clsx('project-card', isSelected && 'project-card--selected')}
      onClick={() => onSelect(project.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(project.id);
        }
      }}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-haspopup="dialog"
    >
      <div className="project-card__layout">
        <div className="project-card__main">
          <div className="project-card__header">
            <div className="project-card__title-block">
              <div className="project-card__title-row">
                <h3>{project.name}</h3>
                {project.favorite ? <Star size={16} className="icon-accent" /> : null}
              </div>
              <p className="project-card__path" title={project.path}>
                {project.path}
              </p>
            </div>

            <div className="project-card__corner">
              <div className="project-card__actions">
                <button type="button" onClick={(event) => { event.stopPropagation(); onAction(project.id, 'openFinder'); }} aria-label={t('projectCardOpenFileManagerAria', { name: project.name, manager: fileManagerLabel })}>
                  <Folder size={16} />
                </button>
                <button type="button" onClick={(event) => { event.stopPropagation(); onAction(project.id, 'openCode'); }} aria-label={t('projectCardOpenVsCodeAria', { name: project.name })}>
                  <BrandMark brand="vscode" size={16} />
                </button>
                <button type="button" onClick={(event) => { event.stopPropagation(); onAction(project.id, 'openTerminal'); }} aria-label={t('projectCardOpenTerminalAria', { name: project.name })}>
                  <TerminalSquare size={16} />
                </button>
              </div>
              <span className={clsx('badge', `badge--${project.status}`)}>{getProjectStatusLabel(project.status, t)}</span>
            </div>
          </div>

          <p className="project-card__description" title={description}>
            {description}
          </p>
        </div>

        <div className="project-card__summary">
          <div className="project-card__meta-grid">
            <div className="project-card__meta-item">
              <span className="project-card__meta-label">{t('projectCardType')}</span>
              <div className="project-card__meta-value">{getProjectTypeLabel(project.projectType, t)}</div>
            </div>
            <div className="project-card__meta-item">
              <span className="project-card__meta-label">{t('projectCardStack')}</span>
              <div className="project-card__meta-value">
                <TechnologyStack stack={project.stack} size="sm" />
              </div>
            </div>
            <div className="project-card__meta-item">
              <span className="project-card__meta-label">{t('projectCardLastAccess')}</span>
              <div className="project-card__meta-value">{formatRelativeDate(project.lastAccessedAt, language)}</div>
            </div>
          </div>
        </div>

        {project.subProjects.length > 0 ? (
          <div className="project-card__subs">
            {project.subProjects.map((sub) => (
              <div key={sub.path} className="project-card__subpill">
                <span className="project-card__subpill-name">{sub.name}</span>
                <TechnologyStack stack={sub.stack} size="sm" emptyLabel={getProjectTypeLabel(sub.projectType as typeof project.projectType, t)} />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}
