import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import {
  Database,
  LayoutDashboard,
  LogOut,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Sun,
  Terminal,
  X,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { useMediaQuery } from '../../hooks/useMediaQuery';
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
import { SHELL_NAV_SECTIONS, isNavItemActive } from './shellNav';
import './AppShell.css';

const SIDEBAR_STORAGE_KEY = 'dashboard-builder-sidebar-collapsed';
const MOBILE_QUERY = '(max-width: 768px)';
/** Routes an anonymous visitor may see. Everything else needs a session. */
const PUBLIC_PATHS = new Set(['/', '/login', '/register']);

function readSidebarCollapsed(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

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
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const collapsed = sidebarCollapsed && !isMobile;

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

  // The drawer is a mobile-only surface; never leave the desktop content inert.
  useEffect(() => {
    if (isMobile || !mobileOpen) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resizing to desktop dismisses the drawer
    setMobileOpen(false);
  }, [isMobile, mobileOpen]);

  const closeMobile = useCallback((returnFocus = false) => {
    setMobileOpen(false);
    if (returnFocus) {
      requestAnimationFrame(() => menuButtonRef.current?.focus());
    }
  }, []);

  // Escape dismisses the drawer and returns focus to its trigger.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMobile(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen, closeMobile]);

  // Put focus inside the drawer as soon as it opens.
  useEffect(() => {
    if (!mobileOpen) return;
    requestAnimationFrame(() => closeButtonRef.current?.focus());
  }, [mobileOpen]);

  // Close the mobile drawer whenever navigation happens.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- transient drawer state resets on navigation
    setMobileOpen(false);
  }, [location.pathname]);

  // Ctrl/Cmd+K opens the palette from anywhere, except inside the SQL editor
  // where Monaco owns its own chords.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k') return;
      if (event.defaultPrevented || event.repeat) return;
      const target = event.target;
      if (target instanceof HTMLElement && target.closest('.monaco-editor')) return;
      event.preventDefault();
      setPaletteOpen((open) => !open);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleLogout = async () => {
    // Wait for the session to clear before showing the sign-in page. Otherwise
    // Login mounts while `user` is still set and redirects straight back to the
    // landing page.
    await dispatch(logoutUser());
    // Replace the protected page so Back cannot return to it.
    navigate('/login', { replace: true });
  };

  const commandItems = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [
      ...SHELL_NAV_SECTIONS.flatMap((section) =>
        section.items.map((item) => ({
          id: `nav-${item.to === '/' ? 'home' : item.to.slice(1)}`,
          label: `Go to ${item.label}`,
          group: 'Navigate',
          icon: item.icon,
          run: () => navigate(item.to),
        })),
      ),
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
      <div className="loading-screen" role="status" aria-live="polite">
        <span className="sr-only">Loading your workspace</span>
        <div className="loading-spinner" aria-hidden="true" />
      </div>
    );
  }

  const routedPage = (
    <Suspense fallback={<RouteFallback />}>
      <Outlet />
    </Suspense>
  );

  if (!user) {
    // Public routes render for anonymous visitors; protected ones fall back to
    // the landing page so browser Back cannot expose a signed-out workspace.
    if (PUBLIC_PATHS.has(location.pathname)) return routedPage;
    return <Navigate to="/" replace />;
  }

  return (
    <div className={`app-shell${mobileOpen ? ' app-shell--drawer-open' : ''}`}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      {mobileOpen && (
        <div
          className="sidebar-backdrop"
          aria-hidden="true"
          onClick={() => closeMobile(true)}
        />
      )}

      <aside
        id="app-sidebar"
        className={`sidebar${mobileOpen ? ' sidebar--mobile-open' : ''}${collapsed ? ' sidebar--collapsed' : ''}`}
        aria-label="Main navigation"
      >
        <div className="sidebar-head">
          <Link to="/" className="sidebar-brand" aria-label="Dashboard Builder home">
            <span className="sidebar-brand__mark" aria-hidden="true">
              <LayoutDashboard size={17} />
            </span>
            <span className="sidebar-brand__text">Dashboard Builder</span>
          </Link>

          <button
            ref={closeButtonRef}
            type="button"
            className="sidebar-mobile-close"
            onClick={() => closeMobile(true)}
            aria-label="Close navigation"
          >
            <X size={18} aria-hidden="true" />
          </button>

          <Tooltip content={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            <button
              type="button"
              className="sidebar-collapse-btn"
              onClick={() => setSidebarCollapsed((current) => !current)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <PanelLeftOpen size={15} aria-hidden="true" /> : <PanelLeftClose size={15} aria-hidden="true" />}
            </button>
          </Tooltip>
        </div>

        <div className="sidebar-nav">
          {SHELL_NAV_SECTIONS.map((section) => (
            <nav key={section.id} className="sidebar-group" aria-label={section.label}>
              <p className="sidebar-group__title" aria-hidden="true">
                {section.label}
              </p>
              <ul>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isNavItemActive(location.pathname, item);
                  const link = (
                    <Link
                      to={item.to}
                      className={active ? 'active' : ''}
                      aria-current={active ? 'page' : undefined}
                    >
                      <Icon className="nav-icon" size={18} aria-hidden="true" />
                      <span className="nav-label">{item.label}</span>
                    </Link>
                  );

                  return (
                    <li key={item.to}>
                      {collapsed ? (
                        <Tooltip content={item.label} side="right">
                          {link}
                        </Tooltip>
                      ) : (
                        link
                      )}
                    </li>
                  );
                })}
              </ul>
            </nav>
          ))}
        </div>
      </aside>

      <div className="main-wrapper" inert={mobileOpen || undefined}>
        <TopBar
          userEmail={user.email}
          userRole={user.role}
          menuOpen={mobileOpen}
          menuButtonRef={menuButtonRef}
          onOpenMenu={() => setMobileOpen(true)}
          onOpenPalette={() => setPaletteOpen(true)}
        />
        <main className="main-content" id="main" tabIndex={-1}>
          {routedPage}
        </main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} items={commandItems} />
      <Toast />
    </div>
  );
};

export default AppShell;
