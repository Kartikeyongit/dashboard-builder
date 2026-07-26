import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { createDatasource, updateDatasource } from '../../store/datasourceSlice';
import type { CreateDatasourcePayload } from '../../types';
import { addToast } from '../../store/toastSlice';
import Dropdown from '../ui/Dropdown';
import './DatasourceForm.css';

const ICONS = {
  building: (
    <svg viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0h8v2H6V4zm0 4h8v2H6V8zm0 4h4v2H6v-2z" clipRule="evenodd" />
    </svg>
  ),
  db: (
    <svg viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 2C5.58 2 2 3.79 2 6v8c0 2.21 3.58 4 8 4s8-1.79 8-4V6c0-2.21-3.58-4-8-4zm0 2c3.23 0 6 .94 6 2s-2.77 2-6 2-6-.94-6-2 2.77-2 6-2zM4 10c0 1.06 2.69 2 6 2s6-.94 6-2v-2c-.82.56-3.07 1.5-6 1.5S4.82 8.56 4 8v2zm0 4c0 1.06 2.69 2 6 2s6-.94 6-2v-2c-.82.56-3.07 1.5-6 1.5S4.82 12.56 4 12v2z" clipRule="evenodd" />
    </svg>
  ),
  globe: (
    <svg viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd" />
    </svg>
  ),
  lock: (
    <svg viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
    </svg>
  ),
  user: (
    <svg viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
    </svg>
  ),
  tag: (
    <svg viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
    </svg>
  ),
};

const DatasourceForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const items = useAppSelector((state) => state.datasources.items);
  const existing = id ? items.find((d) => d.id === id) : null;

  const [form, setForm] = useState<CreateDatasourcePayload>({
    name: '',
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    db_name: '',
    username: '',
    password: '',
    ssl_mode: 'disable',
  });

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name,
        type: existing.type,
        host: existing.host,
        port: existing.port,
        db_name: existing.db_name,
        username: existing.username,
        password: '',
        ssl_mode: existing.ssl_mode,
      });
    }
  }, [existing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'port' ? parseInt(value) : value,
    }));
  };

  const handleTypeChange = (value: string) => {
    setForm((prev) => ({ ...prev, type: value as 'postgres' | 'mysql' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (id) {
      await dispatch(updateDatasource({ id, data: form }));
      dispatch(addToast({ message: 'Datasource updated', type: 'success' }));
    } else {
      await dispatch(createDatasource(form));
      dispatch(addToast({ message: 'Datasource created', type: 'success' }));
    }
    navigate('/datasources');
  };

  return (
    <div className="form-page">
      <button
        type="button"
        className="back-btn"
        onClick={() => navigate('/datasources')}
      >
        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
        </svg>
        Back to Datasources
      </button>

      <div className="form-header">
        <div className="form-header-icon">
          {ICONS.db}
        </div>
        <div className="form-header-text">
          <h2>{id ? 'Edit Datasource' : 'New Datasource'}</h2>
          <p>{id ? 'Update your database connection details.' : 'Connect a PostgreSQL or MySQL database.'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Name</label>
          <div className="input-wrapper">
            <span className="input-icon">{ICONS.tag}</span>
            <input name="name" value={form.name} onChange={handleChange} placeholder="e.g. Production DB" required />
          </div>
        </div>
        <div className="form-group">
          <label>Type</label>
          <Dropdown
            value={form.type}
            onChange={handleTypeChange}
            options={[
              { value: 'postgres', label: 'PostgreSQL' },
              { value: 'mysql', label: 'MySQL' },
            ]}
          />
        </div>
        <div className="form-row">
          <div className="form-group" style={{ flex: 2 }}>
            <label>Host</label>
            <div className="input-wrapper">
              <span className="input-icon">{ICONS.globe}</span>
              <input name="host" value={form.host} onChange={handleChange} placeholder="localhost" required />
            </div>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Port</label>
            <div className="input-wrapper">
              <span className="input-icon">{ICONS.tag}</span>
              <input name="port" type="number" value={form.port} onChange={handleChange} required />
            </div>
          </div>
        </div>
        <div className="form-group">
          <label>Database</label>
          <div className="input-wrapper">
            <span className="input-icon">{ICONS.db}</span>
            <input name="db_name" value={form.db_name} onChange={handleChange} placeholder="e.g. my_database" required />
          </div>
        </div>
        <div className="form-group">
          <label>Username</label>
          <div className="input-wrapper">
            <span className="input-icon">{ICONS.user}</span>
            <input name="username" value={form.username} onChange={handleChange} placeholder="e.g. db_user" required />
          </div>
        </div>
        <div className="form-group">
          <label>Password</label>
          <div className="input-wrapper">
            <span className="input-icon">{ICONS.lock}</span>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder={id ? 'Leave blank to keep current' : 'Enter password'}
              required={!id}
            />
          </div>
        </div>
        <div className="form-group">
          <label>SSL Mode</label>
          <div className="input-wrapper">
            <span className="input-icon">{ICONS.lock}</span>
            <input name="ssl_mode" value={form.ssl_mode} onChange={handleChange} placeholder="disable" />
          </div>
        </div>
        <div className="form-actions">
          <button type="button" className="cancel-btn" onClick={() => navigate('/datasources')}>
            Cancel
          </button>
          <button type="submit" className="save-btn">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" style={{ verticalAlign: 'middle', marginRight: 4 }}>
              <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293z" />
              <path d="M5 4a2 2 0 012-2h5.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V6h-7V4H5z" />
            </svg>
            {id ? 'Update' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DatasourceForm;