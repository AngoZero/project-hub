export type AppPlatform = 'macos' | 'windows' | 'other';

export function detectPlatform(): AppPlatform {
  if (typeof navigator === 'undefined') {
    return 'other';
  }

  const candidate = `${navigator.userAgent} ${navigator.platform}`.toLowerCase();

  if (candidate.includes('win')) {
    return 'windows';
  }

  if (candidate.includes('mac')) {
    return 'macos';
  }

  return 'other';
}

export function isWindowsPlatform(platform: AppPlatform): boolean {
  return platform === 'windows';
}

export function getExampleRootPath(platform: AppPlatform): string {
  if (platform === 'windows') {
    return 'C:\\Users\\you\\Documents\\dev';
  }

  return '/Users/you/Documents/dev';
}

export function getExampleProjectPath(platform: AppPlatform, project: 'frontend' | 'backend'): string {
  if (platform === 'windows') {
    return project === 'frontend'
      ? 'C:\\Users\\you\\Projects\\client-dashboard'
      : 'C:\\Users\\you\\Projects\\ops-api';
  }

  return project === 'frontend'
    ? '/Users/you/Projects/client-dashboard'
    : '/Users/you/Projects/ops-api';
}
