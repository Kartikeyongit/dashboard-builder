import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Database,
  Home as HomeIcon,
  LayoutDashboard,
  LogOut,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Sun,
  Terminal,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { logoutUser, restoreAuth } from '../../store/authSlice';
import { fetchDashboards } from '../../store/dashboardSlice';
import { fetchDatasources } from '../../store/datasourceSlice';
import { fetchQueries } from '../../store/querySlice';
import { useTheme } from '../../theme/useTheme';
import Toast from '../Toast';
import Tooltip from '../../ui/Tooltip';
import RouteFallback from '../ui/RouteFallback';
import CommandPalette from '../../ui/CommandPalette';
import type { CommandItem } from '../../ui/CommandPalette';
import TopBar from './TopBar';
import './AppShell.css';

const SIDEBAR_STORAGE_KEY = 'dashboard-builder-sidebar-collapsed';

function readSidebarCollapsed(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: HomeIcon, end: true },
  { to: '/datasources', label: 'Datasources', icon: Database },
  { to: '/queries', label: 'Queries', icon: Terminal },
  { to: '/dashboards', label: 'Dashboards', icon: LayoutDashboard },
];

const AppShell: React.FC = () => {
  const user = useAppSelector((state) => state.auth.user);
  const isInitializing = useAppSelector((state) => state.auth.isInitializing);
  const dashboards = useAppSelector((state) => state.dashboards.list);
  const datasources = useAppSelector((state) => state.datasources.items);
  const queries = useAppSelector((state) => state.queries.items);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { resolved: theme, toggle: toggleTheme } = useTheme();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsed);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    dispatch(restoreAuth());
  }, [dispatch]);

  // Keep library data warm so breadcrumbs and the command palette can resolve
  // names on any route.
  useEffect(() => {
    if (!user) return;
    dispatch(fetchDashboards());
    dispatch(fetchDatasources());
    dispatch(fetchQueries());
  }, [dispatch, user]);

  // Remember the sidebar choice across reloads.
  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, sidebarCollapsed ? '1' : '0');
    } catch {
      // Storage may be unavailable; the choice still applies for this session.
    }
  }, [sidebarCollapsed]);

  // Close the mobile drawer whenever navigation happens.
  const [lastPath, setLastPath] = useState(location.pathname);
  if (location.pathname !== lastPath) {
    setLastPath(location.pathname);
    setMobileOpen(false);
  }

  // Ctrl/Cmd+K opens the palette from anywhere in the app.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate('/login');
  };

  const commandItems = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [
      { id: 'nav-home', label: 'Go to Home', group: 'Navigate', icon: HomeIcon, run: () => navigate('/') },
      { id: 'nav-datasources', label: 'Go to Datasources', group: 'Navigate', icon: Database, run: () => navigate('/datasources') },
      { id: 'nav-queries', label: 'Go to Queries', group: 'Navigate', icon: Terminal, run: () => navigate('/queries') },
      { id: 'nav-dashboards', label: 'Go to Dashboards', group: 'Navigate', icon: LayoutDashboard, run: () => navigate('/dashboards') },
      { id: 'new-dashboard', label: 'New dashboard', group: 'Create', icon: Plus, run: () => navigate('/dashboards?new=1') },
      { id: 'new-query', label: 'New query', group: 'Create', icon: Plus, run: () => navigate('/queries/new') },
      { id: 'new-datasource', label: 'New datasource', group: 'Create', icon: Plus, run: () => navigate('/datasources/new') },
      {
        id: 'toggle-theme',
        label: theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme',
        group: 'Actions',
        icon: theme === 'dark' ? Sun : Moon,
        run: toggleTheme,
      },
      { id: 'sign-out', label: 'Sign out', group: 'Actions', icon: LogOut, run: handleLogout },
    ];

    dashboards.slice(0, 20).forEach((dashboard) => {
      items.push({
        id: `dashboard-${dashboard.id}`,
        label: dashboard.name,
        group: 'Dashboards',
        icon: LayoutDashboard,
        hint: dashboard.is_favorite ? 'Pinned' : undefined,
        keywords: (dashboard.tags ?? []).join(' '),
        run: () => navigate(`/dashboards/${dashboard.id}`),
      });
    });

    queries.slice(0, 10).forEach((query) => {
      items.push({
        id: `query-${query.id}`,
        label: query.name,
        group: 'Queries',
        icon: Terminal,
        hint: 'Open',
        run: () => navigate(`/queries/${query.id}/edit`),
      });
    });

    datasources.slice(0, 10).forEach((datasource) => {
      items.push({
        id: `datasource-${datasource.id}`,
        label: datasource.name,
        group: 'Datasources',
        icon: Database,
        hint: 'Edit',
        run: () => navigate(`/datasources/${datasource.id}/edit`),
      });
    });

    return items;
    // handleLogout and toggleTheme are stable enough for palette lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboards, datasources, queries, theme, navigate]);

  if (isInitializing) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
      </div>
    );
  }

  const routedPage = (
    <Suspense fallback={<RouteFallback />}>
      <Outlet />
    </Suspense>
  );

  if (!user) {
    return routedPage;
  }

  const isActive = (path: string, end?: boolean) => {
    if (end) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="app-shell">
      {mobileOpen && <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />}

      <aside
        className={`sidebar${mobileOpen ? ' sidebar--mobile-open' : ''}${sidebarCollapsed ? ' sidebar--collapsed' : ''}`}
        aria-label="Main navigation"
      >
        <div className="sidebar-logo">
          <LayoutDashboard className="sidebar-logo-icon" size={22} aria-hidden="true" />
          <span className="sidebar-logo-text">Dashboard Builder</span>
          <Tooltip content={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            <button
              className="sidebar-collapse-btn"
              onClick={() => setSidebarCollapsed((c) => !c)}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
            </button>
          </Tooltip>
        </div>

        <nav>
          <ul className="sidebar-nav">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.to, item.end);
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className={active ? 'active' : ''}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon className="nav-icon" size={18} aria-hidden="true" />
                    <span className="nav-label">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      <div className="main-wrapper">
        <TopBar
          userEmail={user.email}
          onOpenMenu={() => setMobileOpen(true)}
          onOpenPalette={() => setPaletteOpen(true)}
        />
        <main className="main-content">{routedPage}</main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} items={commandItems} />
      <Toast />
    </div>
  );
};

export default AppShell;
