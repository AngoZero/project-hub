/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { detectPlatform, type AppPlatform } from './platform';
import type {
  LanguagePreference,
  NavItem,
  ProjectStatus,
  ProjectType,
  ResolvedLanguage,
  SortOption,
} from './types';

type TranslationValues = Record<string, number | string>;

const LOCALE_BY_LANGUAGE: Record<ResolvedLanguage, string> = {
  en: 'en-US',
  es: 'es-MX',
};

const MESSAGES = {
  en: {
    appTitle: 'Project Hub',
    appSubtitle: 'Local control surface',
    topbarDashboard: 'Dashboard',
    topbarCatalog: 'Project catalog',
    topbarRoots: 'Root folders',
    topbarSettings: 'Settings',
    actionScan: 'Scan',
    actionAddProject: 'Add project',
    actionAddManually: 'Add manually',
    actionDismiss: 'Dismiss',
    actionClose: 'Close',
    actionEdit: 'Edit',
    actionDelete: 'Delete',
    actionCancel: 'Cancel',
    actionSaveProject: 'Save project',
    actionSaveRootFolder: 'Save root folder',
    actionRescanRoots: 'Rescan roots',
    actionOpenTerminal: 'Open terminal',
    actionOpenClaude: 'Open Claude here',
    actionOpenCodex: 'Open Codex here',
    actionOpenVsCode: 'Open VS Code',
    actionOpenFileManager: '{manager}',
    actionCopyPath: 'Copy path',
    actionTerminal: 'Terminal',
    layoutGrid: 'Grid',
    layoutList: 'List',
    searchPlaceholder: 'Search by name, stack, path, or tags',
    filterClient: 'Client',
    filterType: 'Type',
    filterStack: 'Stack',
    filterStatus: 'Status',
    filterAll: 'All',
    filterFavoritesOnly: 'Favorites only',
    workspaceAll: 'All',
    statusSuccessImported: '{name} added from {manager}.',
    statusSuccessExisting: '{name} is already registered.',
    statusErrorLoadStore: 'Unable to load Project Hub data.',
    statusErrorSaveProject: 'Unable to save project.',
    statusSuccessProjectSaved: '{name} saved.',
    statusSuccessProjectRemoved: 'Project removed.',
    statusErrorRemoveProject: 'Unable to remove project.',
    statusSuccessRootSaved: 'Root folder saved.',
    statusErrorSaveRoot: 'Unable to save root folder.',
    statusSuccessRootRemoved: 'Root folder removed.',
    statusErrorRemoveRoot: 'Unable to remove root folder.',
    statusSuccessPreferences: 'Preferences updated.',
    statusErrorPreferences: 'Unable to update preferences.',
    statusSuccessScan: 'Project scan completed.',
    statusErrorScan: 'Unable to scan root folders.',
    statusErrorFolderPicker: 'Unable to open the folder picker.',
    statusErrorImportProject: 'Unable to add the selected folder as a project.',
    statusErrorDuplicatePath: 'A project with this folder already exists.',
    statusErrorDesktopOnly: 'This action is available only inside the Tauri desktop runtime.',
    sidebarDashboard: 'Dashboard',
    sidebarProjects: 'Projects',
    sidebarRoots: 'Roots',
    sidebarSettings: 'Settings',
    dashboardEyebrow: 'Developer-first workspace hub',
    dashboardTitle: 'Everything scoped to the right project directory.',
    dashboardCopy:
      'Scan roots once, keep projects searchable, and launch terminal, VS Code, Claude, or Codex from the correct folder without context switching.',
    dashboardProjectsTracked: 'Projects tracked',
    dashboardRootFolders: 'Root folders',
    dashboardFavorites: 'Favorites',
    dashboardFavoritesEmpty: 'Mark projects as favorites to pin them here.',
    dashboardRecentActivity: 'Recent activity',
    dashboardRecentEmpty: 'Recent projects appear after launch actions or command runs.',
    dashboardLastAccess: 'Last access {value}',
    dashboardLaunch: 'Launch from dashboard',
    rootsEyebrow: 'Root folder registry',
    rootsTitle: 'Scan local project directories',
    rootsAdd: 'Add root folder',
    rootsConfigured: 'Configured roots',
    rootsEmpty: 'No roots configured yet. Add one to start scanning local projects.',
    rootsPath: 'Absolute path',
    rootsPathPlaceholderMac: '/Users/you/Documents/dev',
    rootsPathPlaceholderWindows: 'C:\\Users\\you\\Documents\\dev',
    rootsLabel: 'Label',
    rootsLabelPlaceholder: 'Primary workspace',
    rootsDepth: 'Max depth',
    rootsDepthValue: 'Depth {value}',
    settingsEyebrow: 'Local preferences',
    settingsTitle: 'Desktop defaults',
    settingsTheme: 'Theme',
    settingsDark: 'Dark',
    settingsLight: 'Light',
    settingsLanguage: 'Language',
    settingsLanguageSystem: 'System',
    settingsLanguageSpanish: 'Español',
    settingsLanguageEnglish: 'English',
    settingsLanguageCurrent: 'Current language: {value}',
    settingsCatalogLayout: 'Catalog layout',
    settingsSortOrder: 'Sort order',
    settingsSortName: 'Name',
    settingsSortLastAccessed: 'Last accessed',
    settingsSortFavorite: 'Favorites first',
    settingsSortAdded: 'Recently added',
    settingsRootDepth: 'Root scan depth',
    settingsCurrentDepth: 'Current depth: {value}',
    settingsArchived: 'Archived projects',
    settingsArchivedToggle: 'Include archived projects in the catalog',
    projectFormEditEyebrow: 'Edit project',
    projectFormNewEyebrow: 'New project',
    projectFormCreateTitle: 'Create project entry',
    projectFormClose: 'Close modal',
    projectFormName: 'Name',
    projectFormDescription: 'Description',
    projectFormClient: 'Client',
    projectFormTags: 'Tags',
    projectFormTagsPlaceholder: 'client, urgent, maintenance',
    projectFormStack: 'Stack',
    projectFormStackPlaceholder: 'React, TypeScript, Tauri',
    projectFormFavorite: 'Mark as favorite',
    projectFormQuickCommands: 'Quick commands',
    projectFormAddCommand: 'Add command',
    projectFormCommandNamePlaceholder: 'Command name',
    projectFormCommandPlaceholder: 'npm run dev',
    projectFormCommandDescriptionPlaceholder: 'Optional note',
    projectFormRemoveCommand: 'Remove command',
    projectFormLocalUrls: 'Local URLs',
    projectFormAddUrl: 'Add URL',
    projectFormUrlLabelPlaceholder: 'App',
    projectFormUrlPlaceholder: 'http://localhost:5173',
    projectFormRemoveUrl: 'Remove URL',
    projectFormLocalNotes: 'Local notes',
    projectFormNextStep: 'Next step',
    projectFormReminders: 'Reminders',
    projectFormClaudePrompt: 'Claude prompt',
    projectFormCodexPrompt: 'Codex prompt',
    projectFormPending: 'Pending',
    projectDetailEmptyTitle: 'Select a project',
    projectDetailEmptyCopy:
      'Choose a project from the catalog to inspect notes, launch tools, and run commands in context.',
    projectDetailLaunchpad: 'Acciones',
    projectDetailOverview: 'Overview',
    projectDetailDetectedFiles: 'Detected files',
    projectDetailLocalUrls: 'Local URLs',
    projectDetailQuickCommands: 'Quick commands',
    projectDetailSubProjects: 'Sub-projects',
    projectDetailNotes: 'Notes',
    projectDetailClient: 'Client',
    projectDetailTags: 'Tags',
    projectDetailLastAccess: 'Last access',
    projectDetailUnassigned: 'Unassigned',
    projectDetailNoTags: 'No tags',
    projectDetailNoDescription: 'No description yet.',
    projectDetailNoMarkers: 'No markers detected.',
    projectDetailNoLocalUrls: 'No local URLs configured.',
    projectDetailNoQuickCommands: 'No quick commands configured yet.',
    projectDetailNoNextStep: 'No next step recorded.',
    projectDetailNoReminders: 'No reminders yet.',
    projectDetailNoPrompt: 'No prompt saved.',
    projectDetailNoPending: 'No pending items.',
    projectDetailNextStep: 'Next step',
    projectDetailReminders: 'Reminders',
    projectDetailClaudePrompt: 'Claude prompt',
    projectDetailCodexPrompt: 'Codex prompt',
    projectDetailPending: 'Pending',
    projectTableName: 'Name',
    projectTableClient: 'Client',
    projectTableType: 'Type',
    projectTableStack: 'Stack',
    projectTableStatus: 'Status',
    projectTableLastAccess: 'Last access',
    projectCardType: 'Type',
    projectCardStack: 'Stack',
    projectCardLastAccess: 'Last access',
    projectCardNoDescription: 'No description yet.',
    projectCardOpenFileManagerAria: 'Open {name} in {manager}',
    fileManagerFinder: 'Finder',
    fileManagerExplorer: 'Explorer',
    projectCardOpenVsCodeAria: 'Open {name} in VS Code',
    projectCardOpenTerminalAria: 'Open terminal in {name}',
    technologyUnclassified: 'Unclassified',
    projectTypeFrontend: 'Frontend',
    projectTypeBackend: 'Backend',
    projectTypeFullstack: 'Fullstack',
    projectTypeMobile: 'Mobile',
    projectTypeScript: 'Script',
    projectTypeOther: 'Other',
    projectStatusActive: 'Active',
    projectStatusPaused: 'Paused',
    projectStatusArchived: 'Archived',
    relativeNever: 'Never',
    relativeUnknown: 'Unknown',
    relativeJustNow: 'Just now',
    validationProjectNameRequired: 'Project name is required.',
    validationAbsolutePathRequired: 'Absolute path is required.',
    validationCommandNameRequired: 'Name is required.',
    validationCommandRequired: 'Command is required.',
    validationLabelRequired: 'Label is required.',
    validationUrlInvalid: 'Use a valid URL.',
  },
  es: {
    appTitle: 'Project Hub',
    appSubtitle: 'Centro de control local',
    topbarDashboard: 'Dashboard',
    topbarCatalog: 'Catálogo de proyectos',
    topbarRoots: 'Carpetas raíz',
    topbarSettings: 'Ajustes',
    actionScan: 'Escanear',
    actionAddProject: 'Agregar proyecto',
    actionAddManually: 'Agregar manualmente',
    actionDismiss: 'Cerrar',
    actionClose: 'Cerrar',
    actionEdit: 'Editar',
    actionDelete: 'Eliminar',
    actionCancel: 'Cancelar',
    actionSaveProject: 'Guardar proyecto',
    actionSaveRootFolder: 'Guardar carpeta raíz',
    actionRescanRoots: 'Reescanear raíces',
    actionOpenTerminal: 'Abrir terminal',
    actionOpenClaude: 'Abrir Claude aquí',
    actionOpenCodex: 'Abrir Codex aquí',
    actionOpenVsCode: 'Abrir VS Code',
    actionOpenFileManager: '{manager}',
    actionCopyPath: 'Copiar ruta',
    actionTerminal: 'Terminal',
    layoutGrid: 'Grid',
    layoutList: 'List',
    searchPlaceholder: 'Buscar por nombre, stack, ruta o tags',
    filterClient: 'Cliente',
    filterType: 'Tipo',
    filterStack: 'Stack',
    filterStatus: 'Estado',
    filterAll: 'Todos',
    filterFavoritesOnly: 'Solo favoritos',
    workspaceAll: 'Todos',
    statusSuccessImported: '{name} se agregó desde {manager}.',
    statusSuccessExisting: '{name} ya está registrado.',
    statusErrorLoadStore: 'No fue posible cargar los datos de Project Hub.',
    statusErrorSaveProject: 'No fue posible guardar el proyecto.',
    statusSuccessProjectSaved: '{name} se guardó.',
    statusSuccessProjectRemoved: 'Proyecto eliminado.',
    statusErrorRemoveProject: 'No fue posible eliminar el proyecto.',
    statusSuccessRootSaved: 'Carpeta raíz guardada.',
    statusErrorSaveRoot: 'No fue posible guardar la carpeta raíz.',
    statusSuccessRootRemoved: 'Carpeta raíz eliminada.',
    statusErrorRemoveRoot: 'No fue posible eliminar la carpeta raíz.',
    statusSuccessPreferences: 'Preferencias actualizadas.',
    statusErrorPreferences: 'No fue posible actualizar las preferencias.',
    statusSuccessScan: 'Escaneo de proyectos completado.',
    statusErrorScan: 'No fue posible escanear las carpetas raíz.',
    statusErrorFolderPicker: 'No fue posible abrir el selector de carpetas.',
    statusErrorImportProject: 'No fue posible agregar la carpeta seleccionada como proyecto.',
    statusErrorDuplicatePath: 'Ya existe un proyecto con esa carpeta.',
    statusErrorDesktopOnly: 'Esta acción solo está disponible dentro del runtime de Tauri.',
    sidebarDashboard: 'Dashboard',
    sidebarProjects: 'Proyectos',
    sidebarRoots: 'Raíces',
    sidebarSettings: 'Ajustes',
    dashboardEyebrow: 'Hub local para developers',
    dashboardTitle: 'Todo queda apuntando al directorio correcto del proyecto.',
    dashboardCopy:
      'Escanea raíces una vez, mantén los proyectos encontrables y abre terminal, VS Code, Claude o Codex desde la carpeta correcta sin perder contexto.',
    dashboardProjectsTracked: 'Proyectos registrados',
    dashboardRootFolders: 'Carpetas raíz',
    dashboardFavorites: 'Favoritos',
    dashboardFavoritesEmpty: 'Marca proyectos como favoritos para fijarlos aquí.',
    dashboardRecentActivity: 'Actividad reciente',
    dashboardRecentEmpty: 'Los proyectos recientes aparecerán después de abrir herramientas o correr comandos.',
    dashboardLastAccess: 'Último acceso {value}',
    dashboardLaunch: 'Lanzar desde dashboard',
    rootsEyebrow: 'Registro de carpetas raíz',
    rootsTitle: 'Escanea directorios locales de proyectos',
    rootsAdd: 'Agregar carpeta raíz',
    rootsConfigured: 'Raíces configuradas',
    rootsEmpty: 'Aún no hay raíces configuradas. Agrega una para empezar a escanear proyectos locales.',
    rootsPath: 'Ruta absoluta',
    rootsPathPlaceholderMac: '/Users/you/Documents/dev',
    rootsPathPlaceholderWindows: 'C:\\Users\\you\\Documents\\dev',
    rootsLabel: 'Etiqueta',
    rootsLabelPlaceholder: 'Workspace principal',
    rootsDepth: 'Profundidad máxima',
    rootsDepthValue: 'Profundidad {value}',
    settingsEyebrow: 'Preferencias locales',
    settingsTitle: 'Defaults de escritorio',
    settingsTheme: 'Tema',
    settingsDark: 'Oscuro',
    settingsLight: 'Claro',
    settingsLanguage: 'Idioma',
    settingsLanguageSystem: 'Sistema',
    settingsLanguageSpanish: 'Español',
    settingsLanguageEnglish: 'English',
    settingsLanguageCurrent: 'Idioma actual: {value}',
    settingsCatalogLayout: 'Vista del catálogo',
    settingsSortOrder: 'Orden',
    settingsSortName: 'Nombre',
    settingsSortLastAccessed: 'Último acceso',
    settingsSortFavorite: 'Favoritos primero',
    settingsSortAdded: 'Agregados recientemente',
    settingsRootDepth: 'Profundidad de escaneo',
    settingsCurrentDepth: 'Profundidad actual: {value}',
    settingsArchived: 'Proyectos archivados',
    settingsArchivedToggle: 'Incluir proyectos archivados en el catálogo',
    projectFormEditEyebrow: 'Editar proyecto',
    projectFormNewEyebrow: 'Proyecto nuevo',
    projectFormCreateTitle: 'Crear entrada de proyecto',
    projectFormClose: 'Cerrar modal',
    projectFormName: 'Nombre',
    projectFormDescription: 'Descripción',
    projectFormClient: 'Cliente',
    projectFormTags: 'Tags',
    projectFormTagsPlaceholder: 'cliente, urgente, mantenimiento',
    projectFormStack: 'Stack',
    projectFormStackPlaceholder: 'React, TypeScript, Tauri',
    projectFormFavorite: 'Marcar como favorito',
    projectFormQuickCommands: 'Comandos rápidos',
    projectFormAddCommand: 'Agregar comando',
    projectFormCommandNamePlaceholder: 'Nombre del comando',
    projectFormCommandPlaceholder: 'npm run dev',
    projectFormCommandDescriptionPlaceholder: 'Nota opcional',
    projectFormRemoveCommand: 'Eliminar comando',
    projectFormLocalUrls: 'URLs locales',
    projectFormAddUrl: 'Agregar URL',
    projectFormUrlLabelPlaceholder: 'App',
    projectFormUrlPlaceholder: 'http://localhost:5173',
    projectFormRemoveUrl: 'Eliminar URL',
    projectFormLocalNotes: 'Notas locales',
    projectFormNextStep: 'Siguiente paso',
    projectFormReminders: 'Recordatorios',
    projectFormClaudePrompt: 'Prompt de Claude',
    projectFormCodexPrompt: 'Prompt de Codex',
    projectFormPending: 'Pendiente',
    projectDetailEmptyTitle: 'Selecciona un proyecto',
    projectDetailEmptyCopy:
      'Elige un proyecto del catálogo para revisar notas, abrir herramientas y correr comandos con contexto.',
    projectDetailLaunchpad: 'Launch pad',
    projectDetailOverview: 'Resumen',
    projectDetailDetectedFiles: 'Archivos detectados',
    projectDetailLocalUrls: 'URLs locales',
    projectDetailQuickCommands: 'Comandos rápidos',
    projectDetailSubProjects: 'Subproyectos',
    projectDetailNotes: 'Notas',
    projectDetailClient: 'Cliente',
    projectDetailTags: 'Tags',
    projectDetailLastAccess: 'Último acceso',
    projectDetailUnassigned: 'Sin asignar',
    projectDetailNoTags: 'Sin tags',
    projectDetailNoDescription: 'Aún no hay descripción.',
    projectDetailNoMarkers: 'No se detectaron marcadores.',
    projectDetailNoLocalUrls: 'No hay URLs locales configuradas.',
    projectDetailNoQuickCommands: 'Todavía no hay comandos rápidos configurados.',
    projectDetailNoNextStep: 'No hay siguiente paso registrado.',
    projectDetailNoReminders: 'Aún no hay recordatorios.',
    projectDetailNoPrompt: 'No hay prompt guardado.',
    projectDetailNoPending: 'No hay pendientes.',
    projectDetailNextStep: 'Siguiente paso',
    projectDetailReminders: 'Recordatorios',
    projectDetailClaudePrompt: 'Prompt de Claude',
    projectDetailCodexPrompt: 'Prompt de Codex',
    projectDetailPending: 'Pendiente',
    projectTableName: 'Nombre',
    projectTableClient: 'Cliente',
    projectTableType: 'Tipo',
    projectTableStack: 'Stack',
    projectTableStatus: 'Estado',
    projectTableLastAccess: 'Último acceso',
    projectCardType: 'Tipo',
    projectCardStack: 'Stack',
    projectCardLastAccess: 'Último acceso',
    projectCardNoDescription: 'Aún no hay descripción.',
    projectCardOpenFileManagerAria: 'Abrir {name} en {manager}',
    fileManagerFinder: 'Finder',
    fileManagerExplorer: 'Explorer',
    projectCardOpenVsCodeAria: 'Abrir {name} en VS Code',
    projectCardOpenTerminalAria: 'Abrir terminal en {name}',
    technologyUnclassified: 'Sin clasificar',
    projectTypeFrontend: 'Frontend',
    projectTypeBackend: 'Backend',
    projectTypeFullstack: 'Fullstack',
    projectTypeMobile: 'Móvil',
    projectTypeScript: 'Script',
    projectTypeOther: 'Otro',
    projectStatusActive: 'Activo',
    projectStatusPaused: 'Pausado',
    projectStatusArchived: 'Archivado',
    relativeNever: 'Nunca',
    relativeUnknown: 'Desconocido',
    relativeJustNow: 'Justo ahora',
    validationProjectNameRequired: 'El nombre del proyecto es obligatorio.',
    validationAbsolutePathRequired: 'La ruta absoluta es obligatoria.',
    validationCommandNameRequired: 'El nombre es obligatorio.',
    validationCommandRequired: 'El comando es obligatorio.',
    validationLabelRequired: 'La etiqueta es obligatoria.',
    validationUrlInvalid: 'Usa una URL válida.',
  },
} as const;

export type TranslationKey = keyof (typeof MESSAGES)['en'];

interface I18nContextValue {
  language: ResolvedLanguage;
  locale: string;
  platform: AppPlatform;
  t: (key: TranslationKey, values?: TranslationValues) => string;
}

const I18N_CONTEXT = createContext<I18nContextValue | null>(null);

function interpolate(message: string, values: TranslationValues = {}): string {
  return Object.entries(values).reduce((result, [key, value]) => {
    return result.replaceAll(`{${key}}`, String(value));
  }, message);
}

export function resolveLanguagePreference(preference: LanguagePreference, runtimeLanguage?: string): ResolvedLanguage {
  if (preference === 'en' || preference === 'es') {
    return preference;
  }

  const candidate = runtimeLanguage ?? (typeof navigator === 'undefined' ? 'en' : navigator.language);
  return candidate.toLowerCase().startsWith('es') ? 'es' : 'en';
}

export function getLocale(language: ResolvedLanguage): string {
  return LOCALE_BY_LANGUAGE[language];
}

export function translate(
  language: ResolvedLanguage,
  key: TranslationKey,
  values?: TranslationValues,
): string {
  return interpolate(MESSAGES[language][key], values);
}

export function getLanguageLabel(language: ResolvedLanguage, t: I18nContextValue['t']): string {
  return language === 'es' ? t('settingsLanguageSpanish') : t('settingsLanguageEnglish');
}

export function getProjectTypeLabel(projectType: ProjectType, t: I18nContextValue['t']): string {
  const labelByType: Record<ProjectType, TranslationKey> = {
    frontend: 'projectTypeFrontend',
    backend: 'projectTypeBackend',
    fullstack: 'projectTypeFullstack',
    mobile: 'projectTypeMobile',
    script: 'projectTypeScript',
    other: 'projectTypeOther',
  };

  return t(labelByType[projectType]);
}

export function getProjectStatusLabel(status: ProjectStatus, t: I18nContextValue['t']): string {
  const labelByStatus: Record<ProjectStatus, TranslationKey> = {
    active: 'projectStatusActive',
    paused: 'projectStatusPaused',
    archived: 'projectStatusArchived',
  };

  return t(labelByStatus[status]);
}

export function getSortOptionLabel(sortBy: SortOption, t: I18nContextValue['t']): string {
  const labelBySort: Record<SortOption, TranslationKey> = {
    name: 'settingsSortName',
    lastAccessed: 'settingsSortLastAccessed',
    favorite: 'settingsSortFavorite',
    added: 'settingsSortAdded',
  };

  return t(labelBySort[sortBy]);
}

export function getViewLabel(view: NavItem, t: I18nContextValue['t']): string {
  const labelByView: Record<NavItem, TranslationKey> = {
    dashboard: 'topbarDashboard',
    catalog: 'topbarCatalog',
    roots: 'topbarRoots',
    settings: 'topbarSettings',
  };

  return t(labelByView[view]);
}

export function getFileManagerLabel(platform: AppPlatform, t: I18nContextValue['t']): string {
  return platform === 'windows' ? t('fileManagerExplorer') : t('fileManagerFinder');
}

export function getRootsPathPlaceholder(platform: AppPlatform, t: I18nContextValue['t']): string {
  return platform === 'windows' ? t('rootsPathPlaceholderWindows') : t('rootsPathPlaceholderMac');
}

export function I18nProvider({
  languagePreference,
  children,
}: {
  languagePreference: LanguagePreference;
  children: ReactNode;
}) {
  const language = resolveLanguagePreference(languagePreference);
  const locale = getLocale(language);
  const platform = detectPlatform();

  const value = useMemo<I18nContextValue>(() => {
    return {
      language,
      locale,
      platform,
      t: (key, values) => translate(language, key, values),
    };
  }, [language, locale, platform]);

  return <I18N_CONTEXT.Provider value={value}>{children}</I18N_CONTEXT.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18N_CONTEXT);

  if (!context) {
    throw new Error('useI18n must be used within I18nProvider.');
  }

  return context;
}
