import { getLanguageLabel, getSortOptionLabel, useI18n } from '../app/i18n';
import type { Preferences } from '../app/types';

interface SettingsViewProps {
  preferences: Preferences;
  onSave: (preferences: Preferences) => Promise<void>;
}

export function SettingsView({ preferences, onSave }: SettingsViewProps) {
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
      </div>
    </section>
  );
}
