import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, Database, Save } from 'lucide-react';
import { datasourceAPI } from '../../api/datasource';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { createDatasource, fetchDatasources, updateDatasource } from '../../store/datasourceSlice';
import type { CreateDatasourcePayload } from '../../types';
import { addToast } from '../../store/toastSlice';
import { apiErrorMessage } from '../../utils/apiError';
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
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  // A direct visit to /datasources/:id/edit has an empty store, so the record
  // must be fetched before the form can be populated.
  const [resolving, setResolving] = useState(Boolean(id));
  const requestedExisting = useRef(false);

  useEffect(() => {
    if (!id) return;
    if (existing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- stop the loading state once the store resolves the record
      setResolving(false);
      return;
    }
    if (requestedExisting.current) return;
    requestedExisting.current = true;
    dispatch(fetchDatasources()).finally(() => setResolving(false));
  }, [id, existing, dispatch]);

  useEffect(() => {
    if (existing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate the form when the record arrives from the store
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

  const handleTest = async () => {
    if (testing) return;
    setTesting(true);
    setTestResult(null);
    try {
      // An edit form with a blank password keeps the stored secret, so test
      // the saved datasource instead of sending an empty password.
      const res =
        id && !form.password
          ? await datasourceAPI.test(id)
          : await datasourceAPI.testConfig(form);
      const latency = res.data.latency_ms;
      setTestResult({
        ok: true,
        message: latency === undefined ? 'Connection successful' : `Connection successful · ${latency} ms`,
      });
    } catch (err) {
      setTestResult({ ok: false, message: apiErrorMessage(err, 'Connection failed.') });
    } finally {
      setTesting(false);
    }
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

  if (resolving) {
    return (
      <div className="form-page">
        <p className="form-status" role="status">Loading datasource…</p>
      </div>
    );
  }

  if (id && !existing) {
    return (
      <div className="form-page">
        <button type="button" className="back-btn" onClick={() => navigate('/datasources')}>
          <ArrowLeft size={14} aria-hidden="true" />
          Back to datasources
        </button>
        <div className="form-status form-status--error" role="alert">
          <h2>Datasource not found</h2>
          <p>It may have been deleted, or it belongs to another organization.</p>
          <Button variant="secondary" onClick={() => navigate('/datasources')}>
            Back to datasources
          </Button>
        </div>
      </div>
    );
  }

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

        {testResult && (
          <p
            className={`datasource-test-result${testResult.ok ? '' : ' datasource-test-result--error'}`}
            role="status"
          >
            {testResult.ok ? (
              <CheckCircle2 size={14} aria-hidden="true" />
            ) : (
              <AlertCircle size={14} aria-hidden="true" />
            )}
            {testResult.message}
          </p>
        )}

        {error && <p className="ui-form-error" role="alert">{error}</p>}

        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={() => navigate('/datasources')}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleTest}
            loading={testing}
            disabled={!form.host || !form.db_name || !form.username || (!id && !form.password)}
          >
            Test connection
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
