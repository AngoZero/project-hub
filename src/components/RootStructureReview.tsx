import { FolderTree } from 'lucide-react';
import { getRootChildKindLabel, useI18n } from '../app/i18n';
import type { RootChildKind, RootFolderPreview } from '../app/types';

interface RootStructureReviewProps {
  preview: RootFolderPreview;
  title: string;
  description: string;
  emptyCopy: string;
  onKindChange: (path: string, kind: RootChildKind) => void;
}

const KIND_ORDER: RootChildKind[] = ['workspace', 'project', 'ignored'];

export function RootStructureReview({
  preview,
  title,
  description,
  emptyCopy,
  onKindChange,
}: RootStructureReviewProps) {
  const { t } = useI18n();

  return (
    <section className="surface-card structure-review">
      <div className="surface-card__header">
        <div>
          <h3>{title}</h3>
          <p className="surface-card__description">{description}</p>
        </div>
      </div>

      <div className="structure-review__list">
        {preview.children.length > 0 ? (
          preview.children.map((child) => (
            <article key={child.path} className="structure-item">
              <div className="structure-item__main">
                <div className="structure-item__title">
                  <FolderTree size={16} />
                  <strong>{child.name}</strong>
                </div>
                <p className="project-card__path">{child.path}</p>
                <div className="structure-item__meta">
                  <span className="muted-copy">{t('rootChildSuggested', { value: getRootChildKindLabel(child.suggestedKind, t) })}</span>
                  {child.markers.length > 0 ? (
                    <span className="muted-copy">{t('rootChildMarkers', { value: child.markers.join(', ') })}</span>
                  ) : null}
                  {child.descendantProjectCount > 0 ? (
                    <span className="muted-copy">{t('rootChildDescendants', { value: child.descendantProjectCount })}</span>
                  ) : null}
                </div>
              </div>

              <div className="structure-item__choices" role="group" aria-label={child.name}>
                {KIND_ORDER.map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    className={`button ${child.currentKind === kind ? 'button--primary' : 'button--ghost'}`}
                    aria-pressed={child.currentKind === kind}
                    onClick={() => onKindChange(child.path, kind)}
                  >
                    {getRootChildKindLabel(kind, t)}
                  </button>
                ))}
              </div>
            </article>
          ))
        ) : (
          <p className="muted-copy">{emptyCopy}</p>
        )}
      </div>
    </section>
  );
}
