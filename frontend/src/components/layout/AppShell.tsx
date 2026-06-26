import React, { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { logoutUser } from '../../store/authSlice';
import Toast from '../Toast';
import { setTheme } from '../../theme';
import './AppShell.css';

const AppShell: React.FC = () => {
  const user = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [theme, setThemeState] = useState(() =>
    document.documentElement.getAttribute('data-theme') || 'light'
  );

  useEffect(() => {
    setTheme(theme);
  }, [theme]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('theme')) {
        const next = e.matches ? 'dark' : 'light';
        setThemeState(next);
        setTheme(next);
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate('/login');
  };

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setThemeState(next);
    localStorage.setItem('theme', next);
    setTheme(next);
  };

  if (!user) {
    return <Outlet />;
  }

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/' ? 'active' : '';
    return location.pathname.startsWith(path) ? 'active' : '';
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <svg className="sidebar-logo-icon" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="var(--color-primary)" />
            <path d="M8 10h16v2H8zm0 5h12v2H8zm0 5h14v2H8z" fill="white" />
          </svg>
          <span>Dashboard Builder</span>
        </div>

        <nav>
          <ul className="sidebar-nav">
            <li>
              <Link to="/" className={isActive('/')}>
                <svg className="nav-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7A1 1 0 003 11h1v6a1 1 0 001 1h4a1 1 0 001-1v-3h2v3a1 1 0 001 1h4a1 1 0 001-1v-6h1a1 1 0 00.707-1.707l-7-7z" />
                </svg>
                Home
              </Link>
            </li>
            <li>
              <Link to="/datasources" className={isActive('/datasources')}>
                <svg className="nav-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 5a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V9zm0 5a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" />
                </svg>
                Datasources
              </Link>
            </li>
            <li>
              <Link to="/queries" className={isActive('/queries')}>
                <svg className="nav-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
                Queries
              </Link>
            </li>
            <li>
              <Link to="/dashboards" className={isActive('/dashboards')}>
                <svg className="nav-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 8a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zm6-6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zm0 8a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Dashboards
              </Link>
            </li>
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <span className="user-email">{user.email}</span>
          </div>
          <div className="sidebar-actions">
            <button className="theme-btn" onClick={toggleTheme} title={theme === 'light' ? 'Dark mode' : 'Light mode'}>
              {theme === 'light' ? (
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
            <button className="logout-btn" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
      <Toast />
    </div>
  );
};

export default AppShell;
