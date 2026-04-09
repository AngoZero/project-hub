import { FolderTree, Settings2, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { useI18n } from '../app/i18n';
import type { NavItem } from '../app/types';

interface SidebarProps {
  currentView: NavItem;
  onChange: (view: NavItem) => void;
}

const items: Array<{ id: NavItem; labelKey: 'sidebarProjects' | 'sidebarRoots' | 'sidebarSettings'; icon: typeof LayoutDashboard }> = [
  { id: 'catalog', labelKey: 'sidebarProjects', icon: Sparkles },
  { id: 'roots', labelKey: 'sidebarRoots', icon: FolderTree },
  { id: 'settings', labelKey: 'sidebarSettings', icon: Settings2 },
];

export function Sidebar({ currentView, onChange }: SidebarProps) {
  const { t } = useI18n();

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div>
          <p className="sidebar__eyebrow">{t('appTitle')}</p>
          <h1 className="sidebar__title">{t('appSubtitle')}</h1>
        </div>
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
            >
              <Icon size={18} />
              <span>{t(item.labelKey)}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
