import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { fetchDashboards, createDashboard, deleteDashboard } from '../../store/dashboardSlice';
import { addToast } from '../../store/toastSlice';
import EmptyState from '../ui/EmptyState';
import '../ui/ListPage.css';
import './DashboardList.css';

const DashboardList: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { list, loading } = useAppSelector((state) => state.dashboards);

  useEffect(() => {
    dispatch(fetchDashboards());
  }, [dispatch]);

  const handleCreate = async () => {
    const name = prompt('Dashboard name:');
    if (name) {
      const result = await dispatch(createDashboard({ name }));
      if (createDashboard.fulfilled.match(result)) {
        dispatch(addToast({ message: 'Dashboard created', type: 'success' }));
        navigate(`/dashboards/${result.payload.id}/edit`);
      }
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete dashboard?')) {
      dispatch(deleteDashboard(id));
      dispatch(addToast({ message: 'Dashboard deleted', type: 'success' }));
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
          <button className="add-btn" onClick={handleCreate}>+ New Dashboard</button>
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
                  </div>
                  <div className="card-actions">
                    <Link to={`/dashboards/${d.id}/edit`} className="edit-link">Edit</Link>
                    <button className="delete-btn" onClick={() => handleDelete(d.id)}>Delete</button>
                  </div>
                </li>
              ))}
              {list.length === 0 && (
                <li style={{ gridColumn: '1 / -1', listStyle: 'none' }}>
                  <EmptyState
                    icon="dashboard"
                    title="No dashboards yet"
                    description="Create your first dashboard to start visualizing your data."
                    action={{ label: 'New Dashboard', onClick: handleCreate }}
                  />
                </li>
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardList;
