import { getExampleProjectPath, type AppPlatform } from './platform';
import type { AppStore, ProjectRecord, ProjectStatus, ProjectType, ResolvedLanguage } from './types';

const now = new Date().toISOString();

function sampleProject(
  id: string,
  name: string,
  path: string,
  projectType: ProjectType,
  status: ProjectStatus,
  stack: string[],
  description: string,
  language: ResolvedLanguage,
): ProjectRecord {
  return {
    id,
    source: 'sample',
    name,
    path,
    description,
    tags: ['sample'],
    client: language === 'es' ? 'Interno' : 'Internal',
    projectType,
    stack,
    detectedStack: stack,
    favorite: id === 'sample-1',
    lastAccessedAt: now,
    createdAt: now,
    updatedAt: now,
    status,
    quickCommands: [
      {
        id: `${id}-cmd-1`,
        name: language === 'es' ? 'Iniciar servidor dev' : 'Start dev server',
        command: 'npm run dev',
        description:
          language === 'es'
            ? 'Abre el servidor local de desarrollo en una ventana de terminal.'
            : 'Launch the local development server in a terminal window.',
      },
    ],
    localUrls: [
      {
        id: `${id}-url-1`,
        label: language === 'es' ? 'App local' : 'Local app',
        url: 'http://localhost:5173',
      },
    ],
    notes: {
      nextStep:
        language === 'es'
          ? 'Registra una carpeta raíz real para reemplazar esta tarjeta de ejemplo.'
          : 'Register a real root folder to replace this sample card.',
      reminders:
        language === 'es'
          ? 'Project Hub muestra estos ejemplos solo cuando todavía no hay proyectos reales disponibles.'
          : 'Project Hub shows these examples only while no real projects are available.',
      claudePrompt:
        language === 'es'
          ? 'Revisa el siguiente bloque de trabajo y sugiere una ruta segura de implementación.'
          : 'Review the next slice of work and suggest a safe implementation path.',
      codexPrompt:
        language === 'es'
          ? 'Implementa la siguiente tarea usando las convenciones existentes del proyecto.'
          : 'Implement the next task using the existing project conventions.',
      pending:
        language === 'es'
          ? '- Conectar un workspace real\n- Guardar notas específicas del proyecto'
          : '- Connect a real workspace\n- Save project-specific notes',
    },
    detectedFiles: ['package.json', 'vite.config.ts', '.git'],
    git: {
      isRepo: true,
      branch: 'main',
      dirty: false,
    },
    pathExists: false,
    workspaceId: '',
    subProjects: [],
  };
}

export function buildSampleProjects(language: ResolvedLanguage, platform: AppPlatform): ProjectRecord[] {
  return [
    sampleProject(
      'sample-1',
      language === 'es' ? 'Dashboard de cliente' : 'Client Dashboard',
      getExampleProjectPath(platform, 'frontend'),
      'frontend',
      'active',
      ['React', 'TypeScript', 'Vite'],
      language === 'es'
        ? 'Workspace frontend de ejemplo con un stack típico de producto web.'
        : 'Example frontend workspace with a typical web product stack.',
      language,
    ),
    sampleProject(
      'sample-2',
      language === 'es' ? 'API de operaciones' : 'Operations API',
      getExampleProjectPath(platform, 'backend'),
      'backend',
      'paused',
      ['Laravel', 'Docker'],
      language === 'es'
        ? 'Workspace backend de ejemplo que muestra cómo se ven stacks, notas y comandos.'
        : 'Example backend workspace showing how stacks, notes, and commands appear.',
      language,
    ),
  ];
}

export const FALLBACK_STORE: AppStore = {
  version: 2,
  roots: [],
  projects: [],
  workspaces: [],
  preferences: {
    theme: 'dark',
    catalogLayout: 'grid',
    sortBy: 'lastAccessed',
    rootScanDepth: 3,
    showArchived: true,
    language: 'system',
  },
};
