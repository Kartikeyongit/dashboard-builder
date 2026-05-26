import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { logoutUser } from '../../store/authSlice';
import './AppShell.css';

const AppShell: React.FC = () => {
  const user = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate('/login');
  };

  if (!user) {
    return <Outlet />;
  }

  return (
    <div className="app-shell">
      <div className="app-shell__bg">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="sidebar-logo-mark">DB</span>
          <span>Dashboard Builder</span>
        </div>
        <nav>
          <ul className="sidebar-nav">
            <li>
              <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
                <span className="nav-icon">H</span>
                Home
              </Link>
            </li>
            <li>
              <Link to="/datasources" className={location.pathname.startsWith('/datasources') ? 'active' : ''}>
                <span className="nav-icon">D</span>
                Datasources
              </Link>
            </li>
            <li>
              <Link to="/queries" className={location.pathname.startsWith('/queries') ? 'active' : ''}>
                <span className="nav-icon">Q</span>
                Queries
              </Link>
            </li>
            <li>
              <Link to="/dashboards" className={location.pathname.startsWith('/dashboards') ? 'active' : ''}>
                <span className="nav-icon">B</span>
                Dashboards
              </Link>
            </li>
          </ul>
        </nav>
        <div className="sidebar-footer">
          <span className="user-email">{user.email}</span>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
    </div>
  );
};

export default AppShell;
