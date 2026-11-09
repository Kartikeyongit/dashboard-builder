import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Menu as MenuIcon, Moon, Search, Settings, Sun, Users } from 'lucide-react';
import { useAppDispatch } from '../../hooks';
import { logoutUser } from '../../store/authSlice';
import { useTheme } from '../../theme/useTheme';
import Menu from '../../ui/Menu';
import Tooltip from '../../ui/Tooltip';
import Breadcrumbs from './Breadcrumbs';
import './TopBar.css';

interface TopBarProps {
  userEmail: string;
  userRole?: string;
  menuOpen: boolean;
  menuButtonRef: React.RefObject<HTMLButtonElement | null>;
  onOpenMenu: () => void;
  onOpenPalette: () => void;
}

const initialsFromEmail = (email: string) =>
  email
    .split('@')[0]
    .split(/[._-]/)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';

const roleLabel = (role?: string) =>
  role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Member';

const isMac =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);

/**
 * Persistent top bar: breadcrumbs on the left, command palette, theme, and the
 * account menu on the right. The sidebar only holds navigation.
 */
const TopBar: React.FC<TopBarProps> = ({
  userEmail,
  userRole,
  menuOpen,
  menuButtonRef,
  onOpenMenu,
  onOpenPalette,
}) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { resolved: theme, toggle: toggleTheme } = useTheme();

  const handleLogout = async () => {
    // Wait for the session to clear before showing the sign-in page. Otherwise
    // Login mounts while `user` is still set and redirects straight back to the
    // landing page.
    await dispatch(logoutUser());
    // Replace the protected page so Back cannot return to it.
    navigate('/login', { replace: true });
  };

  const themeLabel = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
  const paletteLabel = isMac ? 'Search or jump to… ⌘ K' : 'Search or jump to… Ctrl K';

  return (
    <header className="topbar">
      <div className="topbar__left">
        <button
          ref={menuButtonRef}
          type="button"
          className="topbar__menu-btn"
          onClick={onOpenMenu}
          aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={menuOpen}
          aria-controls="app-sidebar"
        >
          <MenuIcon size={19} aria-hidden="true" />
        </button>
        <Breadcrumbs />
      </div>

      <div className="topbar__right">
        <button
          type="button"
          className="topbar__palette"
          onClick={onOpenPalette}
          aria-label={paletteLabel}
          aria-haspopup="dialog"
          aria-keyshortcuts="Control+K Meta+K"
        >
          <Search size={15} aria-hidden="true" />
          <span className="topbar__palette-label">Search or jump to…</span>{' '}
          <kbd className="topbar__kbd">{isMac ? '⌘ K' : 'Ctrl K'}</kbd>
        </button>

        <Tooltip content={themeLabel}>
          <button
            type="button"
            className="topbar__icon-btn"
            onClick={toggleTheme}
            aria-label={themeLabel}
          >
            {theme === 'dark' ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
          </button>
        </Tooltip>

        <Menu
          label="Account menu"
          className="topbar__account-menu"
          header={
            <span className="topbar__account-meta">
              <span className="topbar__account-email">{userEmail}</span>
              <span className="topbar__account-role">{roleLabel(userRole)}</span>
            </span>
          }
          trigger={
            <button type="button" className="topbar__avatar" aria-label="Account menu" title={userEmail}>
              {initialsFromEmail(userEmail)}
            </button>
          }
          items={[
            { key: 'settings', label: 'Settings', icon: Settings, onSelect: () => navigate('/settings') },
            { key: 'team', label: 'Team', icon: Users, onSelect: () => navigate('/team') },
            {
              key: 'logout',
              label: 'Sign out',
              icon: LogOut,
              danger: true,
              separatorBefore: true,
              onSelect: handleLogout,
            },
          ]}
        />
      </div>
    </header>
  );
};

export default TopBar;
