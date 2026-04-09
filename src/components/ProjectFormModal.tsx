import { useEffect } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { getProjectStatusLabel, getProjectTypeLabel, getRootsPathPlaceholder, useI18n } from '../app/i18n';
import { PROJECT_STATUSES, PROJECT_TYPES, type ProjectRecord } from '../app/types';
import { createId, joinLines } from '../utils/formatters';

function createProjectFormSchema(t: ReturnType<typeof useI18n>['t']) {
  return z.object({
    name: z.string().trim().min(1, t('validationProjectNameRequired')),
    path: z.string().trim().min(1, t('validationAbsolutePathRequired')),
    description: z.string(),
    tags: z.string(),
    client: z.string(),
    projectType: z.enum(PROJECT_TYPES),
    status: z.enum(PROJECT_STATUSES),
    stack: z.string(),
    favorite: z.boolean(),
    nextStep: z.string(),
    reminders: z.string(),
    claudePrompt: z.string(),
    codexPrompt: z.string(),
    pending: z.string(),
    quickCommands: z.array(
      z.object({
        id: z.string(),
        name: z.string().trim().min(1, t('validationCommandNameRequired')),
        command: z.string().trim().min(1, t('validationCommandRequired')),
        description: z.string(),
      }),
    ),
    localUrls: z.array(
      z.object({
        id: z.string(),
        label: z.string().trim().min(1, t('validationLabelRequired')),
        url: z.string().trim().url(t('validationUrlInvalid')),
      }),
    ),
  });
}

type ProjectFormValues = z.infer<ReturnType<typeof createProjectFormSchema>>;

interface ProjectFormModalProps {
  project: ProjectRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (project: ProjectRecord) => Promise<void>;
}

function projectToFormValues(project: ProjectRecord | null): ProjectFormValues {
  return {
    name: project?.name ?? '',
    path: project?.path ?? '',
    description: project?.description ?? '',
    tags: project?.tags.join(', ') ?? '',
    client: project?.client ?? '',
    projectType: project?.projectType ?? 'other',
    status: project?.status ?? 'active',
    stack: project?.stack.join(', ') ?? '',
    favorite: project?.favorite ?? false,
    nextStep: project?.notes.nextStep ?? '',
    reminders: project?.notes.reminders ?? '',
    claudePrompt: project?.notes.claudePrompt ?? '',
    codexPrompt: project?.notes.codexPrompt ?? '',
    pending: project?.notes.pending ?? '',
    quickCommands:
      project?.quickCommands.length ? project.quickCommands : [{ id: createId('command'), name: '', command: '', description: '' }],
    localUrls:
      project?.localUrls.length ? project.localUrls : [{ id: createId('url'), label: '', url: 'http://localhost:5173' }],
  };
}

export function ProjectFormModal({ project, isOpen, onClose, onSubmit }: ProjectFormModalProps) {
  const { platform, t } = useI18n();
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(createProjectFormSchema(t)),
    defaultValues: projectToFormValues(project),
  });

  const commandFields = useFieldArray({
    control: form.control,
    name: 'quickCommands',
  });

  const urlFields = useFieldArray({
    control: form.control,
    name: 'localUrls',
  });

  useEffect(() => {
    form.reset(projectToFormValues(project));
  }, [form, project]);

  if (!isOpen) {
    return null;
  }

  async function handleSubmit(values: ProjectFormValues): Promise<void> {
    const now = new Date().toISOString();
    const nextProject: ProjectRecord = {
      id: project?.id ?? createId('project'),
      source: project?.source ?? 'manual',
      name: values.name.trim(),
      path: values.path.trim(),
      description: values.description.trim(),
      tags: values.tags
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      client: values.client.trim(),
      projectType: values.projectType,
      stack: values.stack
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      detectedStack: project?.detectedStack ?? [],
      favorite: values.favorite,
      lastAccessedAt: project?.lastAccessedAt ?? null,
      createdAt: project?.createdAt ?? now,
      updatedAt: now,
      status: values.status,
      quickCommands: values.quickCommands,
      localUrls: values.localUrls,
      notes: {
        nextStep: values.nextStep.trim(),
        reminders: values.reminders.trim(),
        claudePrompt: values.claudePrompt.trim(),
        codexPrompt: values.codexPrompt.trim(),
        pending: joinLines(values.pending).join('\n'),
      },
      detectedFiles: project?.detectedFiles ?? [],
      git: project?.git ?? { isRepo: false, branch: null, dirty: null },
      pathExists: project?.pathExists ?? true,
      workspaceId: project?.workspaceId ?? '',
      subProjects: project?.subProjects ?? [],
    };

    await onSubmit(nextProject);
    onClose();
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal">
        <div className="modal__header">
          <div>
            <p className="sidebar__eyebrow">{project ? t('projectFormEditEyebrow') : t('projectFormNewEyebrow')}</p>
            <h2>{project ? project.name : t('projectFormCreateTitle')}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label={t('projectFormClose')}>
            <X size={18} />
          </button>
        </div>

        <form className="modal__body" onSubmit={(event) => void form.handleSubmit(handleSubmit)(event)}>
          <div className="form-grid">
            <label className="field">
              <span>{t('projectFormName')}</span>
              <input {...form.register('name')} />
              <small>{form.formState.errors.name?.message}</small>
            </label>
            <label className="field">
              <span>{t('rootsPath')}</span>
              <input {...form.register('path')} placeholder={getRootsPathPlaceholder(platform, t)} />
              <small>{form.formState.errors.path?.message}</small>
            </label>
            <label className="field field--wide">
              <span>{t('projectFormDescription')}</span>
              <textarea rows={3} {...form.register('description')} />
            </label>
            <label className="field">
              <span>{t('projectFormClient')}</span>
              <input {...form.register('client')} />
            </label>
            <label className="field">
              <span>{t('projectFormTags')}</span>
              <input {...form.register('tags')} placeholder={t('projectFormTagsPlaceholder')} />
            </label>
            <label className="field">
              <span>{t('filterType')}</span>
              <select {...form.register('projectType')}>
                {PROJECT_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {getProjectTypeLabel(item, t)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{t('filterStatus')}</span>
              <select {...form.register('status')}>
                {PROJECT_STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {getProjectStatusLabel(item, t)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field field--wide">
              <span>{t('projectFormStack')}</span>
              <input {...form.register('stack')} placeholder={t('projectFormStackPlaceholder')} />
            </label>
          </div>

          <label className="checkbox">
            <input type="checkbox" {...form.register('favorite')} />
            <span>{t('projectFormFavorite')}</span>
          </label>

          <section className="modal-section">
            <div className="surface-card__header">
              <h3>{t('projectFormQuickCommands')}</h3>
              <button
                type="button"
                className="button button--ghost"
                onClick={() => commandFields.append({ id: createId('command'), name: '', command: '', description: '' })}
              >
                <Plus size={16} />
                {t('projectFormAddCommand')}
              </button>
            </div>
            <div className="modal-stack">
              {commandFields.fields.map((field, index) => (
                <div key={field.id} className="list-editor">
                  <input {...form.register(`quickCommands.${index}.name`)} placeholder={t('projectFormCommandNamePlaceholder')} />
                  <input {...form.register(`quickCommands.${index}.command`)} placeholder={t('projectFormCommandPlaceholder')} />
                  <input {...form.register(`quickCommands.${index}.description`)} placeholder={t('projectFormCommandDescriptionPlaceholder')} />
                  <button type="button" className="icon-button" onClick={() => commandFields.remove(index)} aria-label={t('projectFormRemoveCommand')}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="modal-section">
            <div className="surface-card__header">
              <h3>{t('projectFormLocalUrls')}</h3>
              <button
                type="button"
                className="button button--ghost"
                onClick={() => urlFields.append({ id: createId('url'), label: '', url: 'http://localhost:3000' })}
              >
                <Plus size={16} />
                {t('projectFormAddUrl')}
              </button>
            </div>
            <div className="modal-stack">
              {urlFields.fields.map((field, index) => (
                <div key={field.id} className="list-editor">
                  <input {...form.register(`localUrls.${index}.label`)} placeholder={t('projectFormUrlLabelPlaceholder')} />
                  <input {...form.register(`localUrls.${index}.url`)} placeholder={t('projectFormUrlPlaceholder')} />
                  <button type="button" className="icon-button" onClick={() => urlFields.remove(index)} aria-label={t('projectFormRemoveUrl')}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="modal-section">
            <div className="surface-card__header">
              <h3>{t('projectFormLocalNotes')}</h3>
            </div>
            <div className="form-grid">
              <label className="field">
                <span>{t('projectFormNextStep')}</span>
                <textarea rows={3} {...form.register('nextStep')} />
              </label>
              <label className="field">
                <span>{t('projectFormReminders')}</span>
                <textarea rows={3} {...form.register('reminders')} />
              </label>
              <label className="field">
                <span>{t('projectFormClaudePrompt')}</span>
                <textarea rows={4} {...form.register('claudePrompt')} />
              </label>
              <label className="field">
                <span>{t('projectFormCodexPrompt')}</span>
                <textarea rows={4} {...form.register('codexPrompt')} />
              </label>
              <label className="field field--wide">
                <span>{t('projectFormPending')}</span>
                <textarea rows={5} {...form.register('pending')} />
              </label>
            </div>
          </section>

          <div className="modal__footer">
            <button type="button" className="button button--ghost" onClick={onClose}>
              {t('actionCancel')}
            </button>
            <button type="submit" className="button button--primary">
              {t('actionSaveProject')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
