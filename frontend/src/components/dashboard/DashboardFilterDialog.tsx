import React, { useState } from 'react';
import { dashboardAPI } from '../../api/dashboard';
import type { Dashboard, DashboardFilter, DashboardFilterType } from '../../types';
import { addToast } from '../../store/toastSlice';
import { useAppDispatch } from '../../hooks';
import '../ui/Modal.css';
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel filter-dialog" onClick={(event) => event.stopPropagation()}>
        <h3 className="modal-title">Dashboard Filters</h3>
        <p className="filter-dialog-hint">
          Reference a filter in any widget query as <code>{'{{filter_id}}'}</code>. Values are bound as
          SQL parameters, never pasted into the query. Use <strong>View</strong> to test the query with
          different values.
        </p>

        <div className="filter-rows">
          {rows.map((row, index) => (
            <div className="filter-row" key={index}>
              <div className="filter-row-fields">
                <div className="modal-field">
                  <label>ID</label>
                  <input
                    value={row.id}
                    placeholder="start_date"
                    onChange={(event) => updateRow(index, { id: event.target.value })}
                  />
                </div>
                <div className="modal-field">
                  <label>Label</label>
                  <input
                    value={row.label}
                    placeholder="Start date"
                    onChange={(event) => updateRow(index, { label: event.target.value })}
                  />
                </div>
                <div className="modal-field">
                  <label>Type</label>
                  <select
                    value={row.type}
                    onChange={(event) =>
                      updateRow(index, { type: event.target.value as DashboardFilterType })
                    }
                  >
                    {FILTER_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div className="modal-field">
                  <label>Default</label>
                  <input
                    value={row.default ?? ''}
                    placeholder="Optional"
                    onChange={(event) => updateRow(index, { default: event.target.value })}
                  />
                </div>
              </div>

              {row.type === 'select' && (
                <div className="modal-field filter-options-field">
                  <label>Options (comma separated)</label>
                  <input
                    value={row.optionsText}
                    placeholder="paid, pending, refunded"
                    onChange={(event) => updateRow(index, { optionsText: event.target.value })}
                  />
                </div>
              )}

              <button
                type="button"
                className="filter-remove-btn"
                onClick={() => removeRow(index)}
                title="Remove filter"
              >
                Remove
              </button>
            </div>
          ))}

          {rows.length === 0 && (
            <p className="filter-empty">No filters yet. Add one to make this dashboard interactive.</p>
          )}
        </div>

        <button type="button" className="filter-add-btn" onClick={addRow}>
          + Add filter
        </button>

        {error && <div className="error-message">{error}</div>}

        <div className="modal-actions">
          <button
            className="modal-btn modal-btn--primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Filters'}
          </button>
          <button className="modal-btn modal-btn--secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardFilterDialog;
