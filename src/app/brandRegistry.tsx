import { Bot, Boxes, FolderOpen, Orbit, TerminalSquare, type LucideIcon } from 'lucide-react';
import {
  siAstro,
  siCursor,
  siDocker,
  siDotnet,
  siFlutter,
  siGooglegemini,
  siLaravel,
  siNextdotjs,
  siNodedotjs,
  siReact,
  siRust,
  siVite,
  type SimpleIcon,
} from 'simple-icons';
import claudeLogo from '../assets/brands/claude.svg';
import codexLogo from '../assets/brands/codex.svg';
import vscodeLogo from '../assets/brands/vscode.png';

export type BrandKey =
  | 'api'
  | 'antigravity'
  | 'astro'
  | 'claude'
  | 'codex'
  | 'cursor'
  | 'docker'
  | 'dotnet'
  | 'fileManager'
  | 'flutter'
  | 'gemini'
  | 'laravel'
  | 'nextjs'
  | 'node'
  | 'opencode'
  | 'react'
  | 'rust'
  | 'terminal'
  | 'vite'
  | 'vscode';

type BrandMode = 'brand' | 'current';
type BrandSourceKind = 'official' | 'fallback' | 'custom';

interface BaseBrandDefinition {
  label: string;
  sourceKind: BrandSourceKind;
  sourceUrl: string;
  mode: BrandMode;
}

interface SimpleBrandDefinition extends BaseBrandDefinition {
  kind: 'simple';
  icon: SimpleIcon;
}

interface ImageBrandDefinition extends BaseBrandDefinition {
  kind: 'image';
  src: string;
}

interface LucideBrandDefinition extends BaseBrandDefinition {
  kind: 'lucide';
  icon: LucideIcon;
}

export type BrandDefinition = SimpleBrandDefinition | ImageBrandDefinition | LucideBrandDefinition;

export const BRAND_REGISTRY: Record<BrandKey, BrandDefinition> = {
  api: {
    kind: 'lucide',
    icon: Boxes,
    label: 'API',
    mode: 'current',
    sourceKind: 'custom',
    sourceUrl: 'internal:fallback',
  },
  antigravity: {
    kind: 'lucide',
    icon: Orbit,
    label: 'Antigravity',
    mode: 'current',
    sourceKind: 'custom',
    sourceUrl: 'internal:fallback',
  },
  astro: {
    kind: 'simple',
    icon: siAstro,
    label: 'Astro',
    mode: 'brand',
    sourceKind: 'fallback',
    sourceUrl: 'https://simpleicons.org/?q=astro',
  },
  cursor: {
    kind: 'simple',
    icon: siCursor,
    label: 'Cursor',
    mode: 'current',
    sourceKind: 'fallback',
    sourceUrl: 'https://simpleicons.org/?q=cursor',
  },
  claude: {
    kind: 'image',
    src: claudeLogo,
    label: 'Claude',
    mode: 'brand',
    sourceKind: 'official',
    sourceUrl: 'https://claude.ai/favicon.svg',
  },
  codex: {
    kind: 'image',
    src: codexLogo,
    label: 'Codex',
    mode: 'brand',
    sourceKind: 'custom',
    sourceUrl: 'https://openai.com/codex/',
  },
  docker: {
    kind: 'simple',
    icon: siDocker,
    label: 'Docker',
    mode: 'brand',
    sourceKind: 'fallback',
    sourceUrl: 'https://simpleicons.org/?q=docker',
  },
  dotnet: {
    kind: 'simple',
    icon: siDotnet,
    label: '.NET',
    mode: 'brand',
    sourceKind: 'fallback',
    sourceUrl: 'https://simpleicons.org/?q=dotnet',
  },
  fileManager: {
    kind: 'lucide',
    icon: FolderOpen,
    label: 'File manager',
    mode: 'current',
    sourceKind: 'custom',
    sourceUrl: 'internal:fallback',
  },
  flutter: {
    kind: 'simple',
    icon: siFlutter,
    label: 'Flutter',
    mode: 'brand',
    sourceKind: 'fallback',
    sourceUrl: 'https://simpleicons.org/?q=flutter',
  },
  gemini: {
    kind: 'simple',
    icon: siGooglegemini,
    label: 'Gemini',
    mode: 'brand',
    sourceKind: 'fallback',
    sourceUrl: 'https://simpleicons.org/?q=gemini',
  },
  laravel: {
    kind: 'simple',
    icon: siLaravel,
    label: 'Laravel',
    mode: 'brand',
    sourceKind: 'fallback',
    sourceUrl: 'https://simpleicons.org/?q=laravel',
  },
  nextjs: {
    kind: 'simple',
    icon: siNextdotjs,
    label: 'Next.js',
    mode: 'current',
    sourceKind: 'fallback',
    sourceUrl: 'https://simpleicons.org/?q=next.js',
  },
  node: {
    kind: 'simple',
    icon: siNodedotjs,
    label: 'Node',
    mode: 'brand',
    sourceKind: 'fallback',
    sourceUrl: 'https://simpleicons.org/?q=node.js',
  },
  opencode: {
    kind: 'lucide',
    icon: Bot,
    label: 'OpenCode',
    mode: 'current',
    sourceKind: 'custom',
    sourceUrl: 'internal:fallback',
  },
  react: {
    kind: 'simple',
    icon: siReact,
    label: 'React',
    mode: 'brand',
    sourceKind: 'fallback',
    sourceUrl: 'https://simpleicons.org/?q=react',
  },
  rust: {
    kind: 'simple',
    icon: siRust,
    label: 'Rust',
    mode: 'current',
    sourceKind: 'fallback',
    sourceUrl: 'https://simpleicons.org/?q=rust',
  },
  terminal: {
    kind: 'lucide',
    icon: TerminalSquare,
    label: 'Terminal',
    mode: 'current',
    sourceKind: 'custom',
    sourceUrl: 'internal:fallback',
  },
  vite: {
    kind: 'simple',
    icon: siVite,
    label: 'Vite',
    mode: 'brand',
    sourceKind: 'fallback',
    sourceUrl: 'https://simpleicons.org/?q=vite',
  },
  vscode: {
    kind: 'image',
    src: vscodeLogo,
    label: 'VS Code',
    mode: 'brand',
    sourceKind: 'official',
    sourceUrl: 'https://code.visualstudio.com/assets/apple-touch-icon.png',
  },
};

const STACK_BRAND_BY_NAME: Record<string, BrandKey> = {
  API: 'api',
  Astro: 'astro',
  Claude: 'claude',
  Docker: 'docker',
  '.NET': 'dotnet',
  Flutter: 'flutter',
  Laravel: 'laravel',
  'Next.js': 'nextjs',
  Node: 'node',
  React: 'react',
  Rust: 'rust',
  Vite: 'vite',
};

export function getBrandByKey(key: BrandKey): BrandDefinition {
  return BRAND_REGISTRY[key];
}

export function isBrandKey(value: string): value is BrandKey {
  return value in BRAND_REGISTRY;
}

export function getStackBrandKey(stackName: string): BrandKey | null {
  return STACK_BRAND_BY_NAME[stackName] ?? null;
}

export function getStackBrand(stackName: string): BrandDefinition | null {
  const key = getStackBrandKey(stackName);
  return key ? BRAND_REGISTRY[key] : null;
}
