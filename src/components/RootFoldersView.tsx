import { FolderPlus, RefreshCcw, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useI18n } from '../app/i18n';
import type { RootFolder } from '../app/types';
import { createId } from '../utils/formatters';

interface RootFoldersViewProps {
  roots: RootFolder[];
  defaultDepth: number;
  onSave: (root: RootFolder) => Promise<void>;
  onDelete: (rootId: string) => Promise<void>;
  onRescan: () => Promise<void>;
}

interface RootFolderForm {
  path: string;
  label: string;
  maxDepth: number;
}

export function RootFoldersView({ roots, defaultDepth, onSave, onDelete, onRescan }: RootFoldersViewProps) {
  const { t } = useI18n();
  const { register, handleSubmit, reset } = useForm<RootFolderForm>({
    defaultValues: {
      path: '',
      label: '',
      maxDepth: defaultDepth,
    },
  });

  async function onSubmit(values: RootFolderForm): Promise<void> {
    await onSave({
      id: createId('root'),
      path: values.path.trim(),
      label: values.label.trim(),
      maxDepth: values.maxDepth,
      createdAt: new Date().toISOString(),
    });
    reset({ path: '', label: '', maxDepth: defaultDepth });
  }

  return (
    <section className="roots-view">
      <div className="view-header">
        <div>
          <p className="sidebar__eyebrow">{t('rootsEyebrow')}</p>
          <h2>{t('rootsTitle')}</h2>
        </div>
        <button type="button" className="button button--ghost" onClick={() => void onRescan()}>
          <RefreshCcw size={16} />
          {t('actionRescanRoots')}
        </button>
      </div>

      <div className="roots-layout">
        <form className="surface-card form-card" onSubmit={(event) => void handleSubmit(onSubmit)(event)}>
          <div className="surface-card__header">
            <h3>
              <FolderPlus size={16} />
              {t('rootsAdd')}
            </h3>
          </div>
          <label className="field">
            <span>{t('rootsPath')}</span>
            <input {...register('path', { required: true })} placeholder={t('rootsPathPlaceholder')} />
          </label>
          <label className="field">
            <span>{t('rootsLabel')}</span>
            <input {...register('label')} placeholder={t('rootsLabelPlaceholder')} />
          </label>
          <label className="field">
            <span>{t('rootsDepth')}</span>
            <input type="number" min={1} max={6} {...register('maxDepth', { valueAsNumber: true })} />
          </label>
          <button type="submit" className="button button--primary">{t('actionSaveRootFolder')}</button>
        </form>

        <section className="surface-card">
          <div className="surface-card__header">
            <h3>{t('rootsConfigured')}</h3>
          </div>
          <div className="stack-list">
            {roots.length > 0 ? (
              roots.map((root) => (
                <article key={root.id} className="list-card">
                  <div>
                    <strong>{root.label || root.path}</strong>
                    <span>{root.path}</span>
                    <small>{t('rootsDepthValue', { value: root.maxDepth })}</small>
                  </div>
                  <button type="button" className="icon-button" onClick={() => void onDelete(root.id)} aria-label={`${t('actionDelete')} ${root.path}`}>
                    <Trash2 size={16} />
                  </button>
                </article>
              ))
            ) : (
              <p className="muted-copy">{t('rootsEmpty')}</p>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
