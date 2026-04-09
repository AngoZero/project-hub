export function normalizePath(path: string): string {
  return path.trim().replace(/\/+$/, '');
}
