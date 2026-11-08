import type { LucideIcon } from 'lucide-react';
import {
  Database,
  Home as HomeIcon,
  LayoutDashboard,
  Settings as SettingsIcon,
  Terminal,
  Users,
} from 'lucide-react';

export interface ShellNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Match the route exactly. Used for the root so it never wins everywhere. */
  end?: boolean;
}

export interface ShellNavSection {
  id: string;
  label: string;
  items: ShellNavItem[];
}

/**
 * Signed-in navigation. Dashboards come first because they are the primary
 * artifact; datasources and queries are the inputs that feed them.
 */
export const SHELL_NAV_SECTIONS: ShellNavSection[] = [
  {
    id: 'workspace',
    label: 'Workspace',
    items: [
      { to: '/', label: 'Home', icon: HomeIcon, end: true },
      { to: '/dashboards', label: 'Dashboards', icon: LayoutDashboard },
      { to: '/queries', label: 'Queries', icon: Terminal },
      { to: '/datasources', label: 'Datasources', icon: Database },
    ],
  },
  {
    id: 'manage',
    label: 'Manage',
    items: [
      { to: '/team', label: 'Team', icon: Users },
      { to: '/settings', label: 'Settings', icon: SettingsIcon },
    ],
  },
];

/** True when the current pathname belongs to the item's section. */
export function isNavItemActive(
  pathname: string,
  item: Pick<ShellNavItem, 'to' | 'end'>,
): boolean {
  if (item.end) return pathname === item.to;
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}
