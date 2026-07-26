import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { fetchDatasources, deleteDatasource, testDatasourceConnection } from '../../store/datasourceSlice';
import { addToast } from '../../store/toastSlice';
import EmptyState from '../ui/EmptyState';
import '../ui/ListPage.css';
import './DatasourceList.css';

const DatasourceList: React.FC = () => {
  const dispatch = useAppDispatch();
  const { items, loading } = useAppSelector((state) => state.datasources);

  useEffect(() => {
    dispatch(fetchDatasources());
  }, [dispatch]);

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this datasource?')) {
      dispatch(deleteDatasource(id));
      dispatch(addToast({ message: 'Datasource deleted', type: 'success' }));
    }
  };

  const handleTest = async (id: string) => {
    const result = await dispatch(testDatasourceConnection(id));
    if (testDatasourceConnection.fulfilled.match(result)) {
      dispatch(addToast({ message: 'Connection successful', type: 'success' }));
    } else {
      dispatch(addToast({ message: 'Connection failed', type: 'error' }));
    }
  };

  return (
    <div className="list-page">
      <div className="list-panel">
        <div className="page-header">
          <div>
            <p className="eyebrow">Datasources</p>
            <h2>Connected Databases</h2>
            <p className="lede">Manage your PostgreSQL and MySQL connections.</p>
          </div>
          <Link to="/datasources/new" className="add-btn">+ Add Datasource</Link>
        </div>

        <div className="list-grid-wrapper">
          {loading && (
            <ul className="list-grid">
              {[...Array(4)].map((_, i) => <li key={i} className="skeleton-card" />)}
            </ul>
          )}

          {!loading && (
            <ul className="list-grid">
              {items.map((ds) => (
                <li key={ds.id} className="list-card">
                  <div className="card-header">
                    <div className="card-icon card-icon--indigo">
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 5a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V9zm0 5a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" />
                      </svg>
                    </div>
                    <div className="card-title">
                      {ds.name}
                      <span className="type-badge">{ds.type}</span>
                    </div>
                  </div>
                  <div className="card-detail">
                    <span>{ds.host}:{ds.port}/{ds.db_name}</span>
                    <span>{ds.username}</span>
                  </div>
                  <div className="card-actions">
                    <button className="edit-link" onClick={() => handleTest(ds.id)}>Test</button>
                    <Link to={`/datasources/${ds.id}/edit`} className="edit-link">Edit</Link>
                    <button className="delete-btn" onClick={() => handleDelete(ds.id)}>Delete</button>
                  </div>
                </li>
              ))}
              {items.length === 0 && (
                <li style={{ gridColumn: '1 / -1', listStyle: 'none' }}>
                  <EmptyState
                    icon="datasource"
                    title="No datasources yet"
                    description="Connect your first database to start building queries."
                    action={{ label: 'Add Datasource', to: '/datasources/new' }}
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

export default DatasourceList;
