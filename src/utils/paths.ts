import { detectPlatform, isWindowsPlatform, type AppPlatform } from '../app/platform';

function isWindowsDriveRoot(path: string): boolean {
  return /^[a-zA-Z]:\\$/.test(path);
}

export function normalizePath(path: string, platform: AppPlatform = detectPlatform()): string {
  const trimmed = path.trim();

  if (!trimmed) {
    return '';
  }

  if (isWindowsPlatform(platform)) {
    const withBackslashes = trimmed.replace(/\//g, '\\');
    if (isWindowsDriveRoot(withBackslashes)) {
      return withBackslashes;
    }

    return withBackslashes.replace(/[\\/]+$/, '');
  }

  return trimmed.replace(/\/+$/, '');
}

export function getComparablePath(path: string, platform: AppPlatform = detectPlatform()): string {
  const normalized = normalizePath(path, platform);
  return isWindowsPlatform(platform) ? normalized.toLowerCase() : normalized;
}

export function getPathLeafName(path: string, platform: AppPlatform = detectPlatform()): string {
  const normalized = normalizePath(path, platform);
  const segments = normalized.split(/[\\/]/).filter(Boolean);
  return segments.at(-1) ?? 'project';
}
