import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { fetchQueries, deleteQuery } from '../../store/querySlice';
import { queryAPI } from '../../api/query';
import { addToast } from '../../store/toastSlice';
import '../ui/ListPage.css';
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
      dispatch(addToast({ message: 'Query deleted', type: 'success' }));
    }
  };

  const handleRun = async (id: string) => {
    try {
      await queryAPI.executeSaved(id);
      dispatch(addToast({ message: 'Query executed successfully', type: 'success' }));
    } catch (err: any) {
      dispatch(addToast({ message: err.response?.data?.message || 'Execution failed', type: 'error' }));
    }
  };

  return (
    <div className="list-page">
      <div className="list-panel">
        <div className="page-header">
          <div>
            <p className="eyebrow">Queries</p>
            <h2>Saved SQL</h2>
            <p className="lede">Reusable queries you've built from connected datasources.</p>
          </div>
          <Link to="/queries/new" className="add-btn">+ New Query</Link>
        </div>

        <div className="list-grid-wrapper">
          {loading && (
            <ul className="list-grid">
              {[...Array(6)].map((_, i) => (
                <li key={i} className="skeleton-card" />
              ))}
            </ul>
          )}

          {!loading && (
            <ul className="list-grid">
              {items.map((q) => (
                <li key={q.id} className="list-card">
                  <div className="card-header">
                    <div className="card-icon card-icon--indigo">
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="card-title">{q.name}</span>
                  </div>
                  <div className="sql-preview">
                    {q.sql_text.substring(0, 80)}
                    {q.sql_text.length > 80 ? '…' : ''}
                  </div>
                  <div className="card-actions">
                    <Link to={`/queries/${q.id}/edit`} className="edit-link">Edit</Link>
                    <button className="edit-link" onClick={() => handleRun(q.id)}>Run</button>
                    <button className="delete-btn" onClick={() => handleDelete(q.id)}>Delete</button>
                  </div>
                </li>
              ))}
              {items.length === 0 && (
                <li className="empty-state">
                  <svg className="empty-state-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                  <div><strong>No queries saved yet</strong><br />Write your first SQL query to get started.</div>
                </li>
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default QueryList;
