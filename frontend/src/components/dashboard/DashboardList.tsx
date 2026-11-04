import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, LayoutTemplate, Star } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks';
import {
  createDashboard,
  deleteDashboard,
  duplicateDashboard,
  fetchDashboards,
  hideDashboard,
  restoreDashboard,
  setDashboardFavorite,
  updateDashboard,
} from '../../store/dashboardSlice';
import { addToast } from '../../store/toastSlice';
import { canEditContent } from '../../utils/permissions';
import { useDeferredDelete } from '../../hooks/useDeferredDelete';
import {
  DASHBOARD_SORT_OPTIONS,
  filterDashboards,
  sortDashboards,
} from '../../utils/library';
import type { DashboardSort } from '../../utils/library';
import { pluralize } from '../../utils/format';
import {
  DASHBOARD_TEMPLATES,
  DEFAULT_TEMPLATE_ID,
  getDashboardTemplate,
  templatePayload,
} from '../../utils/dashboardTemplates';
import type { Dashboard } from '../../types';
import EmptyState from '../ui/EmptyState';
import ListToolbar from '../ui/ListToolbar';
import Dialog from '../../ui/Dialog';
import Button from '../../ui/Button';
import Field, { Input } from '../../ui/Field';
import RenameDialog from '../../ui/RenameDialog';
import DashboardCard from './DashboardCard';
import DashboardSettingsDialog from './DashboardSettingsDialog';
import '../ui/ListPage.css';
import './DashboardList.css';

const SORT_STORAGE_KEY = 'dashboard-builder-dashboard-sort';

function readSort(): DashboardSort {
  try {
    const stored = window.localStorage.getItem(SORT_STORAGE_KEY);
    if (DASHBOARD_SORT_OPTIONS.some((option) => option.value === stored)) {
      return stored as DashboardSort;
    }
  } catch {
    // Ignore storage failures and fall back to the default.
  }
  return 'updated';
}

const DashboardList: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { list, loading } = useAppSelector((state) => state.dashboards);
  const user = useAppSelector((state) => state.auth.user);
  const canEdit = canEditContent(user);
  const scheduleDelete = useDeferredDelete();

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTemplate, setNewTemplate] = useState(DEFAULT_TEMPLATE_ID);
  const [creating, setCreating] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<Dashboard | null>(null);
  const [settingsTarget, setSettingsTarget] = useState<Dashboard | null>(null);
  const [search, setSearch] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sort, setSort] = useState<DashboardSort>(readSort);

  useEffect(() => {
    dispatch(fetchDashboards());
  }, [dispatch]);

  // The command palette links to /dashboards?new=1.
  useEffect(() => {
    if (searchParams.get('new') !== '1') return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- opening a dialog from a one-shot URL flag
    if (canEdit) setShowCreate(true);
    const next = new URLSearchParams(searchParams);
    next.delete('new');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, canEdit]);

  useEffect(() => {
    try {
      window.localStorage.setItem(SORT_STORAGE_KEY, sort);
    } catch {
      // Storage may be unavailable; the choice still applies for this session.
    }
  }, [sort]);

  const visible = useMemo(
    () => sortDashboards(filterDashboards(list, { query: search, favoritesOnly }), sort),
    [list, search, favoritesOnly, sort],
  );

  const settingsDashboard = settingsTarget
    ? list.find((dashboard) => dashboard.id === settingsTarget.id) ?? settingsTarget
    : null;

  const clearFilters = () => {
    setSearch('');
    setFavoritesOnly(false);
  };

  const handleCreate = async () => {
    const payload = templatePayload(newTemplate, newName);
    if ((!newName.trim() && !payload.name) || creating) return;
    setCreating(true);
    const result = await dispatch(createDashboard(payload));
    setCreating(false);
    if (createDashboard.fulfilled.match(result)) {
      setShowCreate(false);
      setNewName('');
      setNewTemplate(DEFAULT_TEMPLATE_ID);
      dispatch(addToast({ message: 'Dashboard created', type: 'success' }));
      navigate(`/dashboards/${result.payload.id}/edit`);
    } else {
      dispatch(addToast({ message: 'Failed to create dashboard', type: 'error' }));
    }
  };

  /** Keep the suggested name in sync until the user types their own. */
  const handleTemplateChange = (id: string) => {
    const previousDefault = getDashboardTemplate(newTemplate).defaultName;
    const nextDefault = getDashboardTemplate(id).defaultName;
    if (!newName.trim() || newName === previousDefault) {
      setNewName(nextDefault);
    }
    setNewTemplate(id);
  };

  const closeCreate = () => {
    setShowCreate(false);
    setNewName('');
    setNewTemplate(DEFAULT_TEMPLATE_ID);
  };

  const handleRename = async (name: string) => {
    if (!renameTarget) return;
    const result = await dispatch(updateDashboard({ id: renameTarget.id, data: { name } }));
    if (!updateDashboard.fulfilled.match(result)) {
      throw new Error('Could not rename this dashboard. Try again.');
    }
    dispatch(addToast({ message: 'Dashboard renamed', type: 'success' }));
  };

  const handleDuplicate = async (dashboard: Dashboard) => {
    if (duplicatingId) return;
    setDuplicatingId(dashboard.id);
    const result = await dispatch(duplicateDashboard(dashboard.id));
    setDuplicatingId(null);
    if (duplicateDashboard.fulfilled.match(result)) {
      dispatch(addToast({ message: 'Dashboard duplicated', type: 'success' }));
    } else {
      dispatch(addToast({ message: 'Failed to duplicate dashboard', type: 'error' }));
    }
  };

  const handleToggleFavorite = async (dashboard: Dashboard) => {
    const favorite = !dashboard.is_favorite;
    const result = await dispatch(setDashboardFavorite({ id: dashboard.id, favorite }));
    if (!setDashboardFavorite.fulfilled.match(result)) {
      dispatch(addToast({ message: 'Could not update the favorite', type: 'error' }));
    }
  };

  const handleDelete = (dashboard: Dashboard) => {
    scheduleDelete({
      entity: 'Dashboard',
      remove: () => dispatch(hideDashboard(dashboard.id)),
      restore: () => dispatch(restoreDashboard(dashboard)),
      commit: async () => {
        const result = await dispatch(deleteDashboard(dashboard.id));
        return deleteDashboard.fulfilled.match(result)
          ? { ok: true }
          : { ok: false, error: 'Could not delete the dashboard.' };
      },
    });
  };

  const countLabel = (count: number) =>
    count === list.length
      ? pluralize(count, 'dashboard')
      : `${count} of ${pluralize(list.length, 'dashboard')}`;

  return (
    <div className="list-page">
      <div className="list-panel">
        <div className="page-header">
          <div>
            <p className="eyebrow">Dashboards</p>
            <h2>Your Dashboards</h2>
            <p className="lede">Design and view live data dashboards.</p>
          </div>
          {canEdit && (
            <button className="add-btn" onClick={() => setShowCreate(true)}>+ New Dashboard</button>
          )}
        </div>

        <ListToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search dashboards by name, tag, or description"
          sortValue={sort}
          sortOptions={DASHBOARD_SORT_OPTIONS}
          onSortChange={(value) => setSort(value as DashboardSort)}
          count={visible.length}
          countLabel={countLabel}
        >
          <button
            type="button"
            className={`list-filter-chip${favoritesOnly ? ' list-filter-chip--active' : ''}`}
            onClick={() => setFavoritesOnly((current) => !current)}
            aria-pressed={favoritesOnly}
          >
            <Star size={14} fill={favoritesOnly ? 'currentColor' : 'none'} aria-hidden="true" />
            Pinned
          </button>
        </ListToolbar>

        <div className="list-grid-wrapper">
          {loading && (
            <ul className="list-grid">
              {[...Array(6)].map((_, i) => <li key={i} className="skeleton-card" />)}
            </ul>
          )}

          {!loading && (
            <ul className="list-grid">
              {visible.map((dashboard) => (
                <DashboardCard
                  key={dashboard.id}
                  dashboard={dashboard}
                  canEdit={canEdit}
                  duplicating={duplicatingId === dashboard.id}
                  onDuplicate={() => handleDuplicate(dashboard)}
                  onRename={() => setRenameTarget(dashboard)}
                  onSettings={() => setSettingsTarget(dashboard)}
                  onDelete={() => handleDelete(dashboard)}
                  onToggleFavorite={() => handleToggleFavorite(dashboard)}
                />
              ))}

              {list.length === 0 && (
                <li style={{ gridColumn: '1 / -1', listStyle: 'none' }}>
                  <EmptyState
                    icon="dashboard"
                    title="No dashboards yet"
                    description={canEdit
                      ? 'Create your first dashboard to start visualizing your data.'
                      : 'No dashboards have been shared with you yet.'}
                    action={canEdit ? { label: 'New Dashboard', onClick: () => setShowCreate(true) } : undefined}
                  />
                </li>
              )}

              {list.length > 0 && visible.length === 0 && (
                <li style={{ gridColumn: '1 / -1', listStyle: 'none' }}>
                  <EmptyState
                    icon="dashboard"
                    title="No matching dashboards"
                    description="Try a different search, or clear the Pinned filter to see everything."
                    action={{ label: 'Clear filters', onClick: clearFilters }}
                  />
                </li>
              )}
            </ul>
          )}
        </div>
      </div>

      <Dialog
        open={showCreate}
        onOpenChange={(next) => {
          if (!next) closeCreate();
        }}
        title="New dashboard"
        description="Pick a starting point, then add widgets that use your saved queries."
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={closeCreate} disabled={creating}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreate}
              loading={creating}
              disabled={!newName.trim() && !getDashboardTemplate(newTemplate).defaultName}
            >
              Create dashboard
            </Button>
          </>
        }
      >
        <div className="template-picker">
          <p className="template-picker__label">
            <LayoutTemplate size={14} aria-hidden="true" />
            Template
          </p>
          <div className="template-grid" role="radiogroup" aria-label="Dashboard template">
            {DASHBOARD_TEMPLATES.map((template) => {
              const selected = template.id === newTemplate;
              return (
                <button
                  key={template.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={selected ? 'template-card template-card--selected' : 'template-card'}
                  onClick={() => handleTemplateChange(template.id)}
                >
                  <span className="template-card__head">
                    <span className="template-card__title">{template.label}</span>
                    {selected && <Check size={15} aria-hidden="true" />}
                  </span>
                  <span className="template-card__desc">{template.description}</span>
                  <span className="template-card__meta">{template.highlights.join(' · ')}</span>
                </button>
              );
            })}
          </div>
        </div>

        <Field label="Name" required>
          <Input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={getDashboardTemplate(newTemplate).defaultName || 'e.g. Weekly revenue'}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
        </Field>
      </Dialog>

      <RenameDialog
        open={Boolean(renameTarget)}
        onOpenChange={(next) => {
          if (!next) setRenameTarget(null);
        }}
        title="Rename dashboard"
        initialValue={renameTarget?.name ?? ''}
        onSave={handleRename}
      />

      <DashboardSettingsDialog
        open={Boolean(settingsTarget)}
        onOpenChange={(next) => {
          if (!next) setSettingsTarget(null);
        }}
        dashboard={settingsDashboard}
      />
    </div>
  );
};

export default DashboardList;
