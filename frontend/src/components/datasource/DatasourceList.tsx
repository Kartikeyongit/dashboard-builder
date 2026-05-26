import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { fetchDatasources, deleteDatasource, testDatasourceConnection } from '../../store/datasourceSlice';
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
    }
  };

  const handleTest = (id: string) => {
    dispatch(testDatasourceConnection(id));
  };

  return (
    <div className="datasource-page">
      <div className="datasource-panel">
        <div className="page-header">
          <div>
            <p className="eyebrow">Datasources</p>
            <h2>Connected Databases</h2>
            <p className="lede">Manage your PostgreSQL and MySQL connections.</p>
          </div>
          <Link to="/datasources/new" className="add-btn">+ Add Datasource</Link>
        </div>

        <div className="datasource-grid-wrapper">
          {loading && (
            <ul className="skeleton-grid">
              {[...Array(4)].map((_, i) => <li key={i} className="skeleton-card" />)}
            </ul>
          )}

          {!loading && (
            <ul className="datasource-grid">
              {items.map((ds) => (
                <li key={ds.id} className="datasource-card">
                  <div className="card-title">
                    {ds.name}
                    <span className="type-badge">{ds.type}</span>
                  </div>
                  <div className="card-detail">
                    <span>{ds.host}:{ds.port}/{ds.db_name}</span>
                    <span>{ds.username}</span>
                  </div>
                  <div className="card-actions">
                    <button className="test-btn" onClick={() => handleTest(ds.id)}>Test</button>
                    <Link to={`/datasources/${ds.id}/edit`} className="edit-btn">Edit</Link>
                    <button className="delete-btn" onClick={() => handleDelete(ds.id)}>Delete</button>
                  </div>
                </li>
              ))}
              {items.length === 0 && (
                <li className="empty-state">No datasources yet. Connect your first database.</li>
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default DatasourceList;