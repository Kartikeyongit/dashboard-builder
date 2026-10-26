import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { fetchDashboards, createDashboard, duplicateDashboard, deleteDashboard } from '../../store/dashboardSlice';
import { addToast } from '../../store/toastSlice';
import { canEditContent } from '../../utils/permissions';
import EmptyState from '../ui/EmptyState';
import '../ui/Modal.css';
import '../ui/ListPage.css';
import './DashboardList.css';

const DashboardList: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { list, loading } = useAppSelector((state) => state.dashboards);
  const user = useAppSelector((state) => state.auth.user);
  const canEdit = canEditContent(user);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchDashboards());
  }, [dispatch]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name || creating) return;
    setCreating(true);
    const result = await dispatch(createDashboard({ name }));
    setCreating(false);
    if (createDashboard.fulfilled.match(result)) {
      setShowCreate(false);
      setNewName('');
      dispatch(addToast({ message: 'Dashboard created', type: 'success' }));
      navigate(`/dashboards/${result.payload.id}/edit`);
    } else {
      dispatch(addToast({ message: 'Failed to create dashboard', type: 'error' }));
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    const result = await dispatch(deleteDashboard(pendingDelete.id));
    setPendingDelete(null);
    if (deleteDashboard.fulfilled.match(result)) {
      dispatch(addToast({ message: 'Dashboard deleted', type: 'success' }));
    } else {
      dispatch(addToast({ message: 'Failed to delete dashboard', type: 'error' }));
    }
  };

  const handleDuplicate = async (id: string) => {
    if (duplicatingId) return;
    setDuplicatingId(id);
    const result = await dispatch(duplicateDashboard(id));
    setDuplicatingId(null);
    if (duplicateDashboard.fulfilled.match(result)) {
      dispatch(addToast({ message: 'Dashboard duplicated', type: 'success' }));
    } else {
      dispatch(addToast({ message: 'Failed to duplicate dashboard', type: 'error' }));
    }
  };

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

        <div className="list-grid-wrapper">
          {loading && (
            <ul className="list-grid">
              {[...Array(6)].map((_, i) => <li key={i} className="skeleton-card" />)}
            </ul>
          )}

          {!loading && (
            <ul className="list-grid">
              {list.map((d) => (
                <li key={d.id} className="list-card">
                  <div className="card-header">
                    <div className="card-icon">
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 8a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zm6-6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zm0 8a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                    </div>
                    <span className="card-title">{d.name}</span>
                    {(d.filters?.length ?? 0) > 0 && (
                      <span className="card-filter-badge">{d.filters!.length} filter{d.filters!.length > 1 ? 's' : ''}</span>
                    )}
                  </div>
                  <div className="card-actions">
                    <Link to={`/dashboards/${d.id}`} className="edit-link">
                      View
                    </Link>
                    {canEdit && (
                      <Link to={`/dashboards/${d.id}/edit`} className="edit-link">
                        Edit
                      </Link>
                    )}
                    {canEdit && (
                      <button
                        className="edit-link duplicate-btn"
                        onClick={() => handleDuplicate(d.id)}
                        disabled={duplicatingId === d.id}
                      >
                        {duplicatingId === d.id ? 'Copying...' : 'Duplicate'}
                      </button>
                    )}
                    {canEdit && (
                      <button className="delete-btn" onClick={() => setPendingDelete({ id: d.id, name: d.name })}>
                        Delete
                      </button>
                    )}
                  </div>
                </li>
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
            </ul>
          )}
        </div>
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">New Dashboard</h3>
            <div className="modal-field">
              <label>Name</label>
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Weekly revenue"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <div className="modal-actions">
              <button
                className="modal-btn modal-btn--primary"
                onClick={handleCreate}
                disabled={!newName.trim() || creating}
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
              <button className="modal-btn modal-btn--secondary" onClick={() => setShowCreate(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingDelete && (
        <div className="modal-overlay" onClick={() => setPendingDelete(null)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Delete dashboard?</h3>
            <p className="modal-hint">
              “{pendingDelete.name}” and its widgets will be permanently removed. Queries are not deleted.
            </p>
            <div className="modal-actions">
              <button className="modal-btn modal-btn--primary" onClick={handleDelete}>
                Delete
              </button>
              <button className="modal-btn modal-btn--secondary" onClick={() => setPendingDelete(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardList;
