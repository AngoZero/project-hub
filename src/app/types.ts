export const PROJECT_TYPES = [
  'frontend',
  'backend',
  'fullstack',
  'mobile',
  'script',
  'other',
] as const;

export const PROJECT_STATUSES = ['active', 'paused', 'archived'] as const;

export const SORT_OPTIONS = ['name', 'lastAccessed', 'favorite', 'added'] as const;
export const ROOT_CHILD_KINDS = ['workspace', 'project', 'ignored'] as const;

export const NAV_ITEMS = ['dashboard', 'catalog', 'roots', 'settings'] as const;
export const APP_LANGUAGES = ['system', 'es', 'en'] as const;
export const TOOL_CATEGORIES = ['editor', 'agent', 'terminal', 'fileManager'] as const;
export const LAUNCH_METHODS = ['command', 'executable', 'system'] as const;
export const TOOL_INTEGRATION_SOURCES = ['detected', 'manual', 'system'] as const;

export type ProjectType = (typeof PROJECT_TYPES)[number];
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export type SortOption = (typeof SORT_OPTIONS)[number];
export type NavItem = (typeof NAV_ITEMS)[number];
export type LanguagePreference = (typeof APP_LANGUAGES)[number];
export type ResolvedLanguage = Exclude<LanguagePreference, 'system'>;
export type RootChildKind = (typeof ROOT_CHILD_KINDS)[number];
export type ToolCategory = (typeof TOOL_CATEGORIES)[number];
export type LaunchMethod = (typeof LAUNCH_METHODS)[number];
export type ToolIntegrationSource = (typeof TOOL_INTEGRATION_SOURCES)[number];
export type ProjectActionKind =
  | 'openFinder'
  | 'openCode'
  | 'openTerminal'
  | 'openClaude'
  | 'openCodex'
  | 'openIntegration'
  | 'openLocalUrl'
  | 'runQuickCommand';

export interface QuickCommand {
  id: string;
  name: string;
  command: string;
  description: string;
}

export interface ProjectUrl {
  id: string;
  label: string;
  url: string;
}

export interface ProjectNotes {
  nextStep: string;
  reminders: string;
  claudePrompt: string;
  codexPrompt: string;
  pending: string;
}

export interface ProjectGitInfo {
  isRepo: boolean;
  branch: string | null;
  dirty: boolean | null;
}

export interface SubProject {
  name: string;
  path: string;
  stack: string[];
  projectType: ProjectType;
  detectedFiles: string[];
  git: ProjectGitInfo;
  quickCommands: QuickCommand[];
}

export interface ToolOverride {
  toolId: string;
  enabled: boolean;
  launchMethod: Exclude<LaunchMethod, 'system'>;
  command: string | null;
  executablePath: string | null;
}

export interface Workspace {
  id: string;
  name: string;
  path: string;
}

export interface RootChildRule {
  path: string;
  kind: RootChildKind;
}

export interface RootChildPreview {
  name: string;
  path: string;
  markers: string[];
  suggestedKind: RootChildKind;
  currentKind: RootChildKind;
  descendantProjectCount: number;
}

export interface RootFolderPreview {
  path: string;
  suggestedLabel: string;
  children: RootChildPreview[];
}

export interface ProjectRecord {
  id: string;
  source: 'manual' | 'scanned';
  name: string;
  path: string;
  description: string;
  tags: string[];
  client: string;
  projectType: ProjectType;
  stack: string[];
  detectedStack: string[];
  favorite: boolean;
  lastAccessedAt: string | null;
  createdAt: string;
  updatedAt: string;
  status: ProjectStatus;
  quickCommands: QuickCommand[];
  localUrls: ProjectUrl[];
  notes: ProjectNotes;
  detectedFiles: string[];
  git: ProjectGitInfo;
  pathExists: boolean;
  workspaceId: string;
  subProjects: SubProject[];
}

export interface RootFolder {
  id: string;
  path: string;
  label: string;
  maxDepth: number;
  createdAt: string;
  childRules: RootChildRule[];
}

export interface Preferences {
  theme: 'dark' | 'light';
  catalogLayout: 'grid' | 'list';
  sortBy: SortOption;
  rootScanDepth: number;
  showArchived: boolean;
  language: LanguagePreference;
  hasCompletedOnboarding: boolean;
}

export interface AppStore {
  version: number;
  roots: RootFolder[];
  projects: ProjectRecord[];
  workspaces: Workspace[];
  toolOverrides: ToolOverride[];
  preferences: Preferences;
}

export interface CatalogFilters {
  query: string;
  onlyFavorites: boolean;
  client: string;
  projectType: ProjectType | 'all';
  stack: string;
  status: ProjectStatus | 'all';
  workspace: string;
}

export interface ActionResult {
  ok: boolean;
  message: string;
}

export interface ToolIntegration {
  id: string;
  label: string;
  category: ToolCategory;
  brand: string;
  installed: boolean;
  source: ToolIntegrationSource;
  launchMethod: LaunchMethod;
  command: string | null;
  executablePath: string | null;
  detectedCommand: string | null;
  detectedExecutablePath: string | null;
  reason: string | null;
}
