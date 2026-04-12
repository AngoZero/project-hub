import { useEffect } from 'react';
import type { ProjectActionKind, ProjectRecord, SubProject, ToolIntegration } from '../app/types';
import { ProjectDetail } from './ProjectDetail';

interface ProjectDetailModalProps {
  project: ProjectRecord | null;
  subProject?: SubProject | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: (projectId: string) => void;
  onAction: (projectId: string, kind: ProjectActionKind, targetId?: string, pathOverride?: string) => void;
  onSelectSubProject: (parentProjectId: string, subProjectPath: string) => void;
  integrations: ToolIntegration[];
}

export function ProjectDetailModal({ project, subProject = null, isOpen, onClose, onEdit, onDelete, onAction, onSelectSubProject, integrations }: ProjectDetailModalProps) {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !project) {
    return null;
  }

  return (
    <div className="modal-backdrop modal-backdrop--detail" role="presentation" onClick={onClose}>
      <div
        className="modal modal--detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal__body modal__body--detail">
          <ProjectDetail
            project={project}
            subProject={subProject}
            isModal
            onEdit={onEdit}
            onDelete={onDelete}
            onAction={onAction}
            onSelectSubProject={onSelectSubProject}
            integrations={integrations}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
}
