import type { CatalogFilters, ProjectRecord } from '../app/types';

export function filterProjects(projects: ProjectRecord[], filters: CatalogFilters): ProjectRecord[] {
  const query = filters.query.trim().toLowerCase();

  return projects.filter((project) => {
    if (filters.workspace && project.workspaceId !== filters.workspace) {
      return false;
    }

    if (filters.onlyFavorites && !project.favorite) {
      return false;
    }

    if (filters.client && project.client !== filters.client) {
      return false;
    }

    if (filters.projectType !== 'all' && project.projectType !== filters.projectType) {
      return false;
    }

    if (filters.stack && !project.stack.some((item) => item === filters.stack)) {
      return false;
    }

    if (filters.status !== 'all' && project.status !== filters.status) {
      return false;
    }

    if (!query) {
      return true;
    }

    const haystack = [
      project.name,
      project.path,
      project.description,
      project.client,
      ...project.tags,
      ...project.stack,
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(query);
  });
}

export function sortProjects(projects: ProjectRecord[], sortBy: 'name' | 'lastAccessed' | 'favorite' | 'added'): ProjectRecord[] {
  return [...projects].sort((left, right) => {
    if (sortBy === 'favorite') {
      return Number(right.favorite) - Number(left.favorite) || left.name.localeCompare(right.name);
    }

    if (sortBy === 'lastAccessed') {
      return (Date.parse(right.lastAccessedAt ?? '') || 0) - (Date.parse(left.lastAccessedAt ?? '') || 0);
    }

    if (sortBy === 'added') {
      return (Date.parse(right.createdAt) || 0) - (Date.parse(left.createdAt) || 0);
    }

    return left.name.localeCompare(right.name);
  });
}
