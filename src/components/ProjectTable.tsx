import clsx from 'clsx';
import { getProjectStatusLabel, getProjectTypeLabel, useI18n } from '../app/i18n';
import type { ProjectRecord } from '../app/types';
import { formatRelativeDate } from '../utils/formatters';
import { TechnologyStack } from './TechnologyStack';

interface ProjectTableProps {
  projects: ProjectRecord[];
  selectedProjectId: string | null;
  onSelect: (projectId: string) => void;
}

export function ProjectTable({ projects, selectedProjectId, onSelect }: ProjectTableProps) {
  const { language, t } = useI18n();

  return (
    <div className="table-shell">
      <table className="project-table">
        <thead>
          <tr>
            <th>{t('projectTableName')}</th>
            <th>{t('projectTableClient')}</th>
            <th>{t('projectTableType')}</th>
            <th>{t('projectTableStack')}</th>
            <th>{t('projectTableStatus')}</th>
            <th>{t('projectTableLastAccess')}</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr
              key={project.id}
              className={clsx(selectedProjectId === project.id && 'project-table__row--selected')}
              onClick={() => onSelect(project.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelect(project.id);
                }
              }}
              role="button"
              tabIndex={0}
              aria-selected={selectedProjectId === project.id}
              aria-haspopup="dialog"
            >
              <td>
                <strong>{project.name}</strong>
                <span>{project.path}</span>
              </td>
              <td>{project.client || t('projectDetailUnassigned')}</td>
              <td>{getProjectTypeLabel(project.projectType, t)}</td>
              <td className="project-table__stack-cell">
                <TechnologyStack stack={project.stack} size="sm" />
              </td>
              <td>
                <span className={clsx('badge', `badge--${project.status}`)}>{getProjectStatusLabel(project.status, t)}</span>
              </td>
              <td>{formatRelativeDate(project.lastAccessedAt, language)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
