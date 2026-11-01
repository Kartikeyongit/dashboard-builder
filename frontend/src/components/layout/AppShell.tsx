import React, { Suspense, useEffect, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Database,
  Home as HomeIcon,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Terminal,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { logoutUser, restoreAuth } from '../../store/authSlice';
import { useTheme } from '../../theme/useTheme';
import Toast from '../Toast';
import Tooltip from '../../ui/Tooltip';
import RouteFallback from '../ui/RouteFallback';
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
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { resolved: theme, toggle: toggleTheme } = useTheme();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsed);

  useEffect(() => {
    dispatch(restoreAuth());
  }, [dispatch]);

  // Remember the sidebar choice across reloads.
  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, sidebarCollapsed ? '1' : '0');
    } catch {
      // Storage may be unavailable; the choice still applies for this session.
    }
  }, [sidebarCollapsed]);

  // Close the mobile drawer whenever navigation happens.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const initials = user?.email
    ? user.email
        .split('@')[0]
        .split(/[._-]/)
        .map((s) => s[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '??';

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate('/login');
  };

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

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar" title={user.email}>
              {initials}
            </div>
            <span className="user-email">{user.email}</span>
          </div>
          <div className="sidebar-actions">
            <Tooltip content={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
              <button
                className="user-signout user-signout--theme"
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              >
                {theme === 'dark' ? (
                  <Sun className="user-signout-icon" size={16} aria-hidden="true" />
                ) : (
                  <Moon className="user-signout-icon" size={16} aria-hidden="true" />
                )}
                <span className="user-signout-label">Theme</span>
              </button>
            </Tooltip>
            <button className="user-signout" onClick={handleLogout}>
              <LogOut className="user-signout-icon" size={16} aria-hidden="true" />
              <span className="user-signout-label">Sign out</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="main-wrapper">
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={20} aria-hidden="true" />
        </button>
        <main className="main-content">{routedPage}</main>
      </div>
      <Toast />
    </div>
  );
};

export default AppShell;
