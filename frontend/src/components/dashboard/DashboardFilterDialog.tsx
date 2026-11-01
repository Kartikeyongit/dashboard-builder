import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { dashboardAPI } from '../../api/dashboard';
import type { Dashboard, DashboardFilter, DashboardFilterType } from '../../types';
import { addToast } from '../../store/toastSlice';
import { useAppDispatch } from '../../hooks';
import Dialog from '../../ui/Dialog';
import Button from '../../ui/Button';
import Field, { Input, Select } from '../../ui/Field';
import './DashboardFilterDialog.css';

interface Props {
  dashboard: Dashboard;
  onClose: () => void;
  onSaved: () => void;
}

interface FilterRow extends DashboardFilter {
  optionsText: string;
}

const FILTER_TYPES: DashboardFilterType[] = ['text', 'number', 'date', 'select'];
const ID_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

function toRows(filters: DashboardFilter[] | undefined): FilterRow[] {
  return (filters ?? []).map((filter) => ({
    ...filter,
    optionsText: (filter.options ?? []).join(', '),
  }));
}

const DashboardFilterDialog: React.FC<Props> = ({ dashboard, onClose, onSaved }) => {
  const dispatch = useAppDispatch();
  const [rows, setRows] = useState<FilterRow[]>(() => toRows(dashboard.filters));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const updateRow = (index: number, patch: Partial<FilterRow>) => {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const addRow = () => {
    setRows((current) => [
      ...current,
      { id: '', label: '', type: 'text', default: '', options: [], optionsText: '' },
    ]);
  };

  const removeRow = (index: number) => {
    setRows((current) => current.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (saving) return;
    setError('');

    const seen = new Set<string>();
    const filters: DashboardFilter[] = [];

    for (const row of rows) {
      const id = row.id.trim();
      if (!id) {
        setError('Every filter needs an ID.');
        return;
      }
      if (!ID_PATTERN.test(id)) {
        setError(`Invalid filter ID "${id}". Use letters, numbers, and underscores, starting with a letter.`);
        return;
      }
      if (seen.has(id)) {
        setError(`Duplicate filter ID "${id}".`);
        return;
      }
      seen.add(id);

      const options = row.optionsText
        .split(',')
        .map((option) => option.trim())
        .filter(Boolean);

      if (row.type === 'select' && options.length === 0) {
        setError(`Select filter "${id}" needs at least one option.`);
        return;
      }

      filters.push({
        id,
        label: row.label.trim() || id,
        type: row.type,
        default: row.default?.trim() || undefined,
        options: row.type === 'select' ? options : undefined,
      });
    }

    setSaving(true);
    try {
      await dashboardAPI.update(dashboard.id, {
        name: dashboard.name,
        refresh_interval_seconds: dashboard.refresh_interval_seconds,
        filters,
      });
      dispatch(addToast({ message: 'Filters saved', type: 'success' }));
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save filters.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next && !saving) onClose();
      }}
      title="Dashboard filters"
      description="Filters are bound as SQL parameters, never pasted into your query."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} loading={saving}>
            Save filters
          </Button>
        </>
      }
    >
      <p className="filter-dialog-hint">
        Reference a filter in any widget query as <code>{'{{filter_id}}'}</code>. Use{' '}
        <strong>View</strong> to test the dashboard with different values.
      </p>

      <div className="filter-rows">
        {rows.map((row, index) => (
          <div className="filter-row" key={index}>
            <div className="filter-row-fields">
              <Field label="ID">
                <Input
                  value={row.id}
                  placeholder="start_date"
                  onChange={(event) => updateRow(index, { id: event.target.value })}
                />
              </Field>
              <Field label="Label">
                <Input
                  value={row.label}
                  placeholder="Start date"
                  onChange={(event) => updateRow(index, { label: event.target.value })}
                />
              </Field>
              <Field label="Type">
                <Select
                  value={row.type}
                  onChange={(event) =>
                    updateRow(index, { type: event.target.value as DashboardFilterType })
                  }
                >
                  {FILTER_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Default">
                <Input
                  value={row.default ?? ''}
                  placeholder="Optional"
                  onChange={(event) => updateRow(index, { default: event.target.value })}
                />
              </Field>
            </div>

            {row.type === 'select' && (
              <Field
                label="Options"
                hint="Comma separated, for example: paid, pending, refunded"
                className="filter-options-field"
              >
                <Input
                  value={row.optionsText}
                  placeholder="paid, pending, refunded"
                  onChange={(event) => updateRow(index, { optionsText: event.target.value })}
                />
              </Field>
            )}

            <div className="filter-row-actions">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeRow(index)}
                aria-label={`Remove filter ${row.label || row.id || index + 1}`}
              >
                <Trash2 size={13} aria-hidden="true" />
                Remove
              </Button>
            </div>
          </div>
        ))}

        {rows.length === 0 && (
          <p className="filter-empty">No filters yet. Add one to make this dashboard interactive.</p>
        )}
      </div>

      <div>
        <Button variant="subtle" size="sm" onClick={addRow}>
          <Plus size={13} aria-hidden="true" />
          Add filter
        </Button>
      </div>

      {error && <p className="ui-form-error" role="alert">{error}</p>}
    </Dialog>
  );
};

export default DashboardFilterDialog;
