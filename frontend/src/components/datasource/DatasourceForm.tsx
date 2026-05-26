import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { createDatasource, updateDatasource } from '../../store/datasourceSlice';
import type { CreateDatasourcePayload } from '../../types';
import './DatasourceForm.css';

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'port' ? parseInt(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (id) {
      await dispatch(updateDatasource({ id, data: form }));
    } else {
      await dispatch(createDatasource(form));
    }
    navigate('/datasources');
  };

  return (
    <div className="form-page">
      {/* Back button */}
      <button
        type="button"
        className="back-btn"
        onClick={() => navigate('/datasources')}
      >
        Back to Datasources
      </button>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Name</label>
          <input name="name" value={form.name} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Type</label>
          <select name="type" value={form.type} onChange={handleChange}>
            <option value="postgres">PostgreSQL</option>
            <option value="mysql">MySQL</option>
          </select>
        </div>
        <div className="form-row">
          <div className="form-group" style={{ flex: 2 }}>
            <label>Host</label>
            <input name="host" value={form.host} onChange={handleChange} required />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Port</label>
            <input name="port" type="number" value={form.port} onChange={handleChange} required />
          </div>
        </div>
        <div className="form-group">
          <label>Database</label>
          <input name="db_name" value={form.db_name} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Username</label>
          <input name="username" value={form.username} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            required={!id}
          />
        </div>
        <div className="form-group">
          <label>SSL Mode</label>
          <input name="ssl_mode" value={form.ssl_mode} onChange={handleChange} />
        </div>
        <div className="form-actions">
          <button type="button" className="cancel-btn" onClick={() => navigate('/datasources')}>
            Cancel
          </button>
          <button type="submit" className="save-btn">
            Save
          </button>
        </div>
      </form>
    </div>
  );
};

export default DatasourceForm;