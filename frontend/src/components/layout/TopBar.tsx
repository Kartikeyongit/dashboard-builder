import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Menu as MenuIcon, Moon, Search, Settings, Sun, UserRound, Users } from 'lucide-react';
import { useAppDispatch } from '../../hooks';
import { logoutUser } from '../../store/authSlice';
import { useTheme } from '../../theme/useTheme';
import Menu from '../../ui/Menu';
import Tooltip from '../../ui/Tooltip';
import Breadcrumbs from './Breadcrumbs';
import './TopBar.css';

interface TopBarProps {
  userEmail: string;
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

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

/**
 * Persistent top bar: breadcrumbs on the left, command palette and the account
 * menu on the right. The sidebar now only holds navigation.
 */
const TopBar: React.FC<TopBarProps> = ({ userEmail, onOpenMenu, onOpenPalette }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { resolved: theme, toggle: toggleTheme } = useTheme();

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate('/login');
  };

  const themeLabel = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';

  return (
    <header className="topbar">
      <div className="topbar__left">
        <button
          type="button"
          className="topbar__menu-btn"
          onClick={onOpenMenu}
          aria-label="Open navigation"
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
        >
          <Search size={15} aria-hidden="true" />
          <span className="topbar__palette-label">Search or jump to…</span>
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
          trigger={
            <button type="button" className="topbar__avatar" aria-label="Account menu" title={userEmail}>
              {initialsFromEmail(userEmail)}
            </button>
          }
          items={[
            { key: 'account', label: userEmail, icon: UserRound, disabled: true },
            { key: 'settings', label: 'Settings', icon: Settings, onSelect: () => navigate('/settings'), separatorBefore: true },
            { key: 'team', label: 'Team', icon: Users, onSelect: () => navigate('/team') },
            { key: 'theme', label: themeLabel, icon: theme === 'dark' ? Sun : Moon, onSelect: toggleTheme, separatorBefore: true },
            { key: 'logout', label: 'Sign out', icon: LogOut, onSelect: handleLogout },
          ]}
        />
      </div>
    </header>
  );
};

export default TopBar;
