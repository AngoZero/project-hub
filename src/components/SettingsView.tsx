import { RefreshCcw } from 'lucide-react';
import { isBrandKey } from '../app/brandRegistry';
import { getLanguageLabel, getSortOptionLabel, useI18n } from '../app/i18n';
import type { Preferences, ToolIntegration } from '../app/types';
import { BrandMark } from './BrandMark';

interface SettingsViewProps {
  preferences: Preferences;
  integrations: ToolIntegration[];
  onSave: (preferences: Preferences) => Promise<void>;
  onRefreshIntegrations: () => Promise<void>;
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

export function SettingsView({ preferences, integrations, onSave, onRefreshIntegrations }: SettingsViewProps) {
  const { language, t } = useI18n();

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
            {integrations.map((integration) => (
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
                  <span className="muted-copy">
                    {integration.command ?? integration.executablePath ?? integration.reason ?? t('settingsToolSystem')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
