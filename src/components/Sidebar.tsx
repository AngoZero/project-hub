import { ChevronsLeft, ChevronsRight, FolderTree, Settings2, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { useI18n } from '../app/i18n';
import type { NavItem } from '../app/types';

interface SidebarProps {
  currentView: NavItem;
  collapsed: boolean;
  onChange: (view: NavItem) => void;
  onToggleCollapse: () => void;
}

const items: Array<{ id: NavItem; labelKey: 'sidebarProjects' | 'sidebarRoots' | 'sidebarSettings'; icon: typeof Sparkles }> = [
  { id: 'catalog', labelKey: 'sidebarProjects', icon: Sparkles },
  { id: 'roots', labelKey: 'sidebarRoots', icon: FolderTree },
  { id: 'settings', labelKey: 'sidebarSettings', icon: Settings2 },
];

export function Sidebar({ currentView, collapsed, onChange, onToggleCollapse }: SidebarProps) {
  const { t } = useI18n();

  return (
    <aside className={clsx('sidebar', collapsed && 'sidebar--collapsed')}>
      <div className="sidebar__brand">
        {!collapsed && (
          <div>
            <p className="sidebar__eyebrow">{t('appTitle')}</p>
            <h1 className="sidebar__title">{t('appSubtitle')}</h1>
          </div>
        )}
        <button
          type="button"
          className="sidebar__toggle"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
        </button>
      </div>

      <nav className="sidebar__nav" aria-label={t('appTitle')}>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={clsx('sidebar__nav-item', currentView === item.id && 'sidebar__nav-item--active')}
              onClick={() => onChange(item.id)}
              title={collapsed ? t(item.labelKey) : undefined}
            >
              <Icon size={18} />
              {!collapsed && <span>{t(item.labelKey)}</span>}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
