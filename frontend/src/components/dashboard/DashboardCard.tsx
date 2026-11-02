import React from 'react';
import { Link } from 'react-router-dom';
import {
  Copy,
  MoreHorizontal,
  Pencil,
  Settings,
  Star,
  Trash2,
} from 'lucide-react';
import type { Dashboard } from '../../types';
import { pluralize, refreshLabel, relativeTime } from '../../utils/format';
import Menu from '../../ui/Menu';
import './DashboardCard.css';

interface DashboardCardProps {
  dashboard: Dashboard;
  canEdit: boolean;
  duplicating: boolean;
  onDuplicate: () => void;
  onRename: () => void;
  onSettings: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  dashboard,
  canEdit,
  duplicating,
  onDuplicate,
  onRename,
  onSettings,
  onDelete,
  onToggleFavorite,
}) => {
  const tags = dashboard.tags ?? [];
  const filters = dashboard.filters?.length ?? 0;
  const widgetCount = dashboard.widget_count ?? 0;
  const favorite = Boolean(dashboard.is_favorite);

  return (
    <li className="list-card dashboard-card">
      <div className="dashboard-card__top">
        <div className="card-icon" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
            <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 8a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zm6-6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zm0 8a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        </div>
        <Link to={`/dashboards/${dashboard.id}`} className="dashboard-card__title">
          {dashboard.name}
        </Link>
        <button
          type="button"
          className={`dashboard-card__star${favorite ? ' dashboard-card__star--active' : ''}`}
          onClick={onToggleFavorite}
          aria-pressed={favorite}
          aria-label={favorite ? `Unpin ${dashboard.name}` : `Pin ${dashboard.name}`}
          title={favorite ? 'Unpin dashboard' : 'Pin dashboard'}
        >
          <Star size={16} fill={favorite ? 'currentColor' : 'none'} aria-hidden="true" />
        </button>
        {canEdit && (
          <Menu
            label={`${dashboard.name} actions`}
            trigger={
              <button type="button" className="dashboard-card__menu" aria-label={`${dashboard.name} actions`}>
                <MoreHorizontal size={17} aria-hidden="true" />
              </button>
            }
            items={[
              { key: 'rename', label: 'Rename', icon: Pencil, onSelect: onRename },
              { key: 'settings', label: 'Settings', icon: Settings, onSelect: onSettings },
              {
                key: 'duplicate',
                label: duplicating ? 'Duplicating…' : 'Duplicate',
                icon: Copy,
                onSelect: onDuplicate,
                disabled: duplicating,
              },
              {
                key: 'delete',
                label: 'Delete',
                icon: Trash2,
                onSelect: onDelete,
                danger: true,
                separatorBefore: true,
              },
            ]}
          />
        )}
      </div>

      <p className={`dashboard-card__description${dashboard.description ? '' : ' dashboard-card__description--muted'}`}>
        {dashboard.description || 'No description yet. Add one from Settings.'}
      </p>

      <div className="dashboard-card__meta">
        <span title={new Date(dashboard.updated_at).toLocaleString()}>
          Updated {relativeTime(dashboard.updated_at)}
        </span>
        <span>{pluralize(widgetCount, 'widget')}</span>
        {filters > 0 && <span>{pluralize(filters, 'filter')}</span>}
        {dashboard.refresh_interval_seconds > 0 && (
          <span>Refreshes {refreshLabel(dashboard.refresh_interval_seconds).toLowerCase()}</span>
        )}
      </div>

      {tags.length > 0 && (
        <ul className="dashboard-card__tags" aria-label="Tags">
          {tags.map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
      )}

      <div className="card-actions">
        <Link to={`/dashboards/${dashboard.id}`} className="edit-link">
          View
        </Link>
        {canEdit && (
          <Link to={`/dashboards/${dashboard.id}/edit`} className="edit-link">
            Edit
          </Link>
        )}
      </div>
    </li>
  );
};

export default DashboardCard;
