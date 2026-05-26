import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { fetchQueries, deleteQuery } from '../../store/querySlice';
import { queryAPI } from '../../api/query';
import './QueryList.css';

const QueryList: React.FC = () => {
  const dispatch = useAppDispatch();
  const { items, loading } = useAppSelector((state) => state.queries);

  useEffect(() => {
    dispatch(fetchQueries());
  }, [dispatch]);

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this query?')) {
      dispatch(deleteQuery(id));
    }
  };

  const handleRun = async (id: string) => {
    try {
      await queryAPI.executeSaved(id);
      alert('Query executed successfully');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Execution failed');
    }
  };

  return (
    <div className="query-page">
      <div className="query-panel">
        {/* Header inside the glass panel */}
        <div className="page-header">
          <div>
            <p className="eyebrow">Queries</p>
            <h2>Saved SQL</h2>
            <p className="lede">Reusable queries you’ve built from connected datasources.</p>
          </div>
          <Link to="/queries/new" className="add-btn">+ New Query</Link>
        </div>

        {/* Scrollable grid area */}
        <div className="query-grid-wrapper">
          {loading && (
            <ul className="skeleton-grid">
              {[...Array(6)].map((_, i) => (
                <li key={i} className="skeleton-card" />
              ))}
            </ul>
          )}

          {!loading && (
            <ul className="query-grid">
              {items.map((q) => (
                <li key={q.id} className="query-card">
                  <div className="query-name">{q.name}</div>
                  <div className="sql-preview">
                    {q.sql_text.substring(0, 80)}
                    {q.sql_text.length > 80 ? '…' : ''}
                  </div>
                  <div className="card-actions">
                    <Link to={`/queries/${q.id}/edit`} className="edit-link">Edit</Link>
                    <button className="run-btn" onClick={() => handleRun(q.id)}>Run</button>
                    <button className="delete-btn" onClick={() => handleDelete(q.id)}>Delete</button>
                  </div>
                </li>
              ))}
              {items.length === 0 && (
                <li className="empty-state">No queries saved yet. Write your first SQL query.</li>
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default QueryList;