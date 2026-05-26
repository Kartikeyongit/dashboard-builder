import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { fetchDashboards, createDashboard, deleteDashboard } from '../../store/dashboardSlice';
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
        navigate(`/dashboards/${result.payload.id}/edit`);
      }
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete dashboard?')) {
      dispatch(deleteDashboard(id));
    }
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-panel">
        <div className="page-header">
          <div>
            <p className="eyebrow">Dashboards</p>
            <h2>Your Dashboards</h2>
            <p className="lede">Design and view live data dashboards.</p>
          </div>
          <button className="add-btn" onClick={handleCreate}>+ New Dashboard</button>
        </div>

        <div className="dashboard-grid-wrapper">
          {loading && (
            <ul className="skeleton-grid">
              {[...Array(6)].map((_, i) => <li key={i} className="skeleton-card" />)}
            </ul>
          )}

          {!loading && (
            <ul className="dashboard-grid">
              {list.map((d) => (
                <li key={d.id} className="dashboard-card">
                  <span className="card-name">{d.name}</span>
                  <div className="card-actions">
                    <Link to={`/dashboards/${d.id}/edit`} className="edit-link">Edit</Link>
                    <button className="delete-btn" onClick={() => handleDelete(d.id)}>Delete</button>
                  </div>
                </li>
              ))}
              {list.length === 0 && (
                <li className="empty-state">No dashboards yet. Create your first one.</li>
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardList;