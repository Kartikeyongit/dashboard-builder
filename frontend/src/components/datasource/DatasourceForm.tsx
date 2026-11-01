import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Database, Save } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { createDatasource, updateDatasource } from '../../store/datasourceSlice';
import type { CreateDatasourcePayload } from '../../types';
import { addToast } from '../../store/toastSlice';
import Button from '../../ui/Button';
import Field, { Input, Select } from '../../ui/Field';
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
      [name]: name === 'port' ? parseInt(value, 10) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setError('');
    setSaving(true);

    if (id) {
      const result = await dispatch(updateDatasource({ id, data: form }));
      setSaving(false);
      if (updateDatasource.rejected.match(result)) {
        setError(result.payload || 'Could not update the datasource.');
        return;
      }
      dispatch(addToast({ message: 'Datasource updated', type: 'success' }));
    } else {
      const result = await dispatch(createDatasource(form));
      setSaving(false);
      if (createDatasource.rejected.match(result)) {
        setError(result.payload || 'Could not create the datasource.');
        return;
      }
      dispatch(addToast({ message: 'Datasource created', type: 'success' }));
    }

    navigate('/datasources');
  };

  return (
    <div className="form-page">
      <button type="button" className="back-btn" onClick={() => navigate('/datasources')}>
        <ArrowLeft size={14} aria-hidden="true" />
        Back to datasources
      </button>

      <div className="form-header">
        <div className="form-header-icon">
          <Database size={20} aria-hidden="true" />
        </div>
        <div className="form-header-text">
          <h2>{id ? 'Edit datasource' : 'New datasource'}</h2>
          <p>
            {id
              ? 'Update your database connection details.'
              : 'Connect a PostgreSQL or MySQL database. Credentials are encrypted at rest.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Field label="Name" required>
          <Input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="e.g. Production DB"
            required
          />
        </Field>

        <Field label="Type">
          <Select name="type" value={form.type} onChange={handleChange}>
            <option value="postgres">PostgreSQL</option>
            <option value="mysql">MySQL</option>
          </Select>
        </Field>

        <div className="form-row">
          <Field label="Host" required>
            <Input
              name="host"
              value={form.host}
              onChange={handleChange}
              placeholder="localhost"
              required
            />
          </Field>
          <Field label="Port" required>
            <Input
              name="port"
              type="number"
              value={form.port}
              onChange={handleChange}
              min={1}
              max={65535}
              required
            />
          </Field>
        </div>

        <Field label="Database" required>
          <Input
            name="db_name"
            value={form.db_name}
            onChange={handleChange}
            placeholder="e.g. my_database"
            required
          />
        </Field>

        <Field label="Username" required>
          <Input
            name="username"
            value={form.username}
            onChange={handleChange}
            placeholder="e.g. db_user"
            autoComplete="username"
            required
          />
        </Field>

        <Field
          label="Password"
          required={!id}
          hint={id ? 'Leave blank to keep the current password.' : undefined}
        >
          <Input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder={id ? 'Unchanged' : 'Enter password'}
            autoComplete="new-password"
            required={!id}
          />
        </Field>

        <Field label="SSL mode">
          <Select name="ssl_mode" value={form.ssl_mode} onChange={handleChange}>
            <option value="disable">Disable</option>
            <option value="require">Require</option>
            <option value="verify-ca">Verify CA</option>
            <option value="verify-full">Verify full</option>
          </Select>
        </Field>

        {error && <p className="ui-form-error" role="alert">{error}</p>}

        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={() => navigate('/datasources')}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={saving}>
            <Save size={14} aria-hidden="true" />
            {id ? 'Update datasource' : 'Save datasource'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default DatasourceForm;
