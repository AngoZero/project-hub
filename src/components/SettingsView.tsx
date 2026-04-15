import { useState } from 'react';
import { RefreshCcw } from 'lucide-react';
import { isBrandKey } from '../app/brandRegistry';
import { getLanguageLabel, getSortOptionLabel, useI18n } from '../app/i18n';
import type { Preferences, ToolIntegration, ToolOverride } from '../app/types';
import { BrandMark } from './BrandMark';

interface SettingsViewProps {
  preferences: Preferences;
  integrations: ToolIntegration[];
  toolOverrides: ToolOverride[];
  onSave: (preferences: Preferences) => Promise<void>;
  onRefreshIntegrations: () => Promise<ToolIntegration[]>;
  onSaveToolOverrides: (toolOverrides: ToolOverride[]) => Promise<void>;
}

function getToolCategoryLabel(integration: ToolIntegration, t: ReturnType<typeof useI18n>['t']): string {
  const labelByCategory: Record<ToolIntegration['category'], Parameters<typeof t>[0]> = {
    agent: 'toolCategoryAgent',
    editor: 'toolCategoryEditor',
    fileManager: 'toolCategoryFileManager',
    terminal: 'toolCategoryTerminal',
  };

  return t(labelByCategory[integration.category]);
}

function getToolSourceLabel(integration: ToolIntegration, t: ReturnType<typeof useI18n>['t']): string {
  const labelBySource: Record<ToolIntegration['source'], Parameters<typeof t>[0]> = {
    detected: 'settingsToolSourceDetected',
    manual: 'settingsToolSourceManual',
    system: 'settingsToolSourceSystem',
  };

  return t(labelBySource[integration.source]);
}

function isEditableIntegration(integration: ToolIntegration): boolean {
  return integration.category === 'editor' || integration.category === 'agent';
}

function createDraft(integration: ToolIntegration, overrideItem?: ToolOverride): ToolOverride {
  const inferredMethod = overrideItem?.launchMethod
    ?? (overrideItem?.executablePath || integration.executablePath || integration.detectedExecutablePath ? 'executable' : 'command');

  return {
    toolId: integration.id,
    enabled: true,
    launchMethod: inferredMethod,
    command: overrideItem?.command ?? integration.command ?? integration.detectedCommand,
    executablePath: overrideItem?.executablePath ?? integration.executablePath ?? integration.detectedExecutablePath,
  };
}

function getIntegrationValue(integration: ToolIntegration, t: ReturnType<typeof useI18n>['t']): string {
  return integration.command ?? integration.executablePath ?? integration.reason ?? t('settingsToolSystem');
}

export function SettingsView({
  preferences,
  integrations,
  toolOverrides,
  onSave,
  onRefreshIntegrations,
  onSaveToolOverrides,
}: SettingsViewProps) {
  const { language, t } = useI18n();
  const [editingToolId, setEditingToolId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ToolOverride | null>(null);

  function updateDraft(toolId: string, patch: Partial<ToolOverride>): void {
    setDraft((current) => {
      if (!current || current.toolId !== toolId) {
        return current;
      }

      return {
        ...current,
        ...patch,
      };
    });
  }

  function startEditing(integration: ToolIntegration, overrideItem?: ToolOverride): void {
    setEditingToolId(integration.id);
    setDraft(createDraft(integration, overrideItem));
  }

  async function handleSaveOverride(integration: ToolIntegration): Promise<void> {
    if (!draft || draft.toolId !== integration.id) {
      return;
    }

    const normalizedDraft: ToolOverride = {
      ...draft,
      command: draft.launchMethod === 'command' ? draft.command?.trim() || null : null,
      executablePath: draft.launchMethod === 'executable' ? draft.executablePath?.trim() || null : null,
    };

    const nextOverrides = [
      ...toolOverrides.filter((overrideItem) => overrideItem.toolId !== integration.id),
      normalizedDraft,
    ];

    await onSaveToolOverrides(nextOverrides);
    setEditingToolId(null);
    setDraft(null);
  }

  async function handleResetOverride(toolId: string): Promise<void> {
    await onSaveToolOverrides(toolOverrides.filter((overrideItem) => overrideItem.toolId !== toolId));
    setEditingToolId((current) => (current === toolId ? null : current));
    setDraft((current) => (current?.toolId === toolId ? null : current));
  }

  return (
    <section className="settings-view">
      <div className="view-header">
        <div>
          <p className="sidebar__eyebrow">{t('settingsEyebrow')}</p>
          <h2>{t('settingsTitle')}</h2>
        </div>
      </div>

      <div className="settings-grid">
        <article className="surface-card">
          <h3>{t('settingsTheme')}</h3>
          <div className="button-row">
            <button
              type="button"
              className={`button ${preferences.theme === 'dark' ? 'button--primary' : 'button--ghost'}`}
              onClick={() => void onSave({ ...preferences, theme: 'dark' })}
            >
              {t('settingsDark')}
            </button>
            <button
              type="button"
              className={`button ${preferences.theme === 'light' ? 'button--primary' : 'button--ghost'}`}
              onClick={() => void onSave({ ...preferences, theme: 'light' })}
            >
              {t('settingsLight')}
            </button>
          </div>
        </article>

        <article className="surface-card">
          <h3>{t('settingsLanguage')}</h3>
          <div className="button-row">
            <button
              type="button"
              className={`button ${preferences.language === 'system' ? 'button--primary' : 'button--ghost'}`}
              onClick={() => void onSave({ ...preferences, language: 'system' })}
            >
              {t('settingsLanguageSystem')}
            </button>
            <button
              type="button"
              className={`button ${preferences.language === 'es' ? 'button--primary' : 'button--ghost'}`}
              onClick={() => void onSave({ ...preferences, language: 'es' })}
            >
              {t('settingsLanguageSpanish')}
            </button>
            <button
              type="button"
              className={`button ${preferences.language === 'en' ? 'button--primary' : 'button--ghost'}`}
              onClick={() => void onSave({ ...preferences, language: 'en' })}
            >
              {t('settingsLanguageEnglish')}
            </button>
          </div>
          <p className="muted-copy">{t('settingsLanguageCurrent', { value: getLanguageLabel(language, t) })}</p>
        </article>

        <article className="surface-card">
          <h3>{t('settingsCatalogLayout')}</h3>
          <div className="button-row">
            <button
              type="button"
              className={`button ${preferences.catalogLayout === 'grid' ? 'button--primary' : 'button--ghost'}`}
              onClick={() => void onSave({ ...preferences, catalogLayout: 'grid' })}
            >
              {t('layoutGrid')}
            </button>
            <button
              type="button"
              className={`button ${preferences.catalogLayout === 'list' ? 'button--primary' : 'button--ghost'}`}
              onClick={() => void onSave({ ...preferences, catalogLayout: 'list' })}
            >
              {t('layoutList')}
            </button>
          </div>
        </article>

        <article className="surface-card">
          <h3>{t('settingsSortOrder')}</h3>
          <select
            value={preferences.sortBy}
            onChange={(event) => void onSave({ ...preferences, sortBy: event.target.value as Preferences['sortBy'] })}
          >
            <option value="name">{getSortOptionLabel('name', t)}</option>
            <option value="lastAccessed">{getSortOptionLabel('lastAccessed', t)}</option>
            <option value="favorite">{getSortOptionLabel('favorite', t)}</option>
            <option value="added">{getSortOptionLabel('added', t)}</option>
          </select>
        </article>

        <article className="surface-card">
          <h3>{t('settingsRootDepth')}</h3>
          <input
            type="range"
            min={1}
            max={6}
            value={preferences.rootScanDepth}
            onChange={(event) => void onSave({ ...preferences, rootScanDepth: Number(event.target.value) })}
          />
          <p className="muted-copy">{t('settingsCurrentDepth', { value: preferences.rootScanDepth })}</p>
        </article>

        <article className="surface-card">
          <h3>{t('settingsArchived')}</h3>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={preferences.showArchived}
              onChange={(event) => void onSave({ ...preferences, showArchived: event.target.checked })}
            />
            <span>{t('settingsArchivedToggle')}</span>
          </label>
        </article>

        <article className="surface-card settings-tools">
          <div className="surface-card__header">
            <div>
              <h3>{t('settingsTools')}</h3>
              <p className="surface-card__description">{t('settingsToolsCopy')}</p>
            </div>
            <button type="button" className="button button--ghost" onClick={() => void onRefreshIntegrations()}>
              <RefreshCcw size={16} />
              {t('settingsToolsRefresh')}
            </button>
          </div>
          <div className="tool-list">
            {integrations.map((integration) => {
              const overrideItem = toolOverrides.find((item) => item.toolId === integration.id);
              const editable = isEditableIntegration(integration);
              const isEditing = editingToolId === integration.id;
              const activeDraft = isEditing && draft?.toolId === integration.id ? draft : null;
              const detectedValue = integration.detectedCommand ?? integration.detectedExecutablePath;
              const draftValue = activeDraft?.launchMethod === 'command' ? activeDraft.command ?? '' : activeDraft?.executablePath ?? '';
              const canSave = activeDraft
                ? (activeDraft.launchMethod === 'command' ? Boolean(activeDraft.command?.trim()) : Boolean(activeDraft.executablePath?.trim()))
                : false;

              return (
                <div key={integration.id} className="tool-row">
                  <div className="tool-row__identity">
                    <BrandMark brand={isBrandKey(integration.brand) ? integration.brand : 'api'} size={18} />
                    <div>
                      <strong>{integration.label}</strong>
                      <span>{getToolCategoryLabel(integration, t)}</span>
                    </div>
                  </div>
                  <div className="tool-row__meta">
                    <span className={`badge ${integration.installed ? 'badge--active' : 'badge--paused'}`}>
                      {integration.installed ? t('settingsToolInstalled') : t('settingsToolMissing')}
                    </span>
                    <span className="badge badge--neutral">{getToolSourceLabel(integration, t)}</span>
                    <span className="muted-copy">{getIntegrationValue(integration, t)}</span>
                    {overrideItem ? (
                      <span className="muted-copy">{t('settingsToolManualValue', { value: getIntegrationValue(integration, t) })}</span>
                    ) : null}
                    {overrideItem && detectedValue ? (
                      <span className="muted-copy">{t('settingsToolDetectedValue', { value: detectedValue })}</span>
                    ) : null}
                    {editable ? (
                      <>
                        {isEditing && activeDraft ? (
                          <div className="modal-stack">
                            <div className="list-editor">
                              <select
                                value={activeDraft.launchMethod}
                                onChange={(event) => updateDraft(integration.id, { launchMethod: event.target.value as ToolOverride['launchMethod'] })}
                              >
                                <option value="command">{t('settingsToolUseCommand')}</option>
                                <option value="executable">{t('settingsToolUseExecutable')}</option>
                              </select>
                              <input
                                value={draftValue}
                                onChange={(event) => updateDraft(integration.id, activeDraft.launchMethod === 'command'
                                  ? { command: event.target.value }
                                  : { executablePath: event.target.value })}
                                placeholder={activeDraft.launchMethod === 'command' ? t('settingsToolCommandPlaceholder') : t('settingsToolExecutablePlaceholder')}
                              />
                            </div>
                            <div className="button-row">
                              <button type="button" className="button button--primary" onClick={() => void handleSaveOverride(integration)} disabled={!canSave}>
                                {t('settingsToolSave')}
                              </button>
                              <button type="button" className="button button--ghost" onClick={() => { setEditingToolId(null); setDraft(null); }}>
                                {t('actionCancel')}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="button-row">
                            <button type="button" className="button button--ghost" onClick={() => void onRefreshIntegrations()}>
                              {t('settingsToolReview')}
                            </button>
                            <button type="button" className="button button--ghost" onClick={() => startEditing(integration, overrideItem)}>
                              {overrideItem ? t('settingsToolEdit') : t('settingsToolConfigure')}
                            </button>
                            {overrideItem ? (
                              <button type="button" className="button button--ghost" onClick={() => void handleResetOverride(integration.id)}>
                                {t('settingsToolReset')}
                              </button>
                            ) : null}
                          </div>
                        )}
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      </div>
    </section>
  );
}
