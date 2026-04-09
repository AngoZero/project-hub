import { useEffect } from 'react';
import type { ProjectRecord } from '../app/types';
import { ProjectDetail } from './ProjectDetail';

interface ProjectDetailModalProps {
  project: ProjectRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: (projectId: string) => void;
  onAction: (
    projectId: string,
    kind: 'openFinder' | 'openCode' | 'openTerminal' | 'openClaude' | 'openCodex' | 'openLocalUrl' | 'runQuickCommand',
    targetId?: string,
  ) => void;
}

export function ProjectDetailModal({ project, isOpen, onClose, onEdit, onDelete, onAction }: ProjectDetailModalProps) {
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
            isModal
            onEdit={onEdit}
            onDelete={onDelete}
            onAction={onAction}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
}
