import React from 'react';
import type { DashboardFilter, DashboardFilterType, DashboardFilterValues } from '../../types';

interface Props {
  filters: DashboardFilter[];
  values: DashboardFilterValues;
  loading?: boolean;
  dirty?: boolean;
  onChange: (id: string, value: string, type: DashboardFilterType) => void;
  onApply: () => void;
  onReset: () => void;
}

const DATE_PRESETS: Array<{ label: string; days: number }> = [
  { label: 'Today', days: 0 },
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
];

/** Local `YYYY-MM-DD` without the UTC shift toISOString() would introduce. */
const localDate = (daysAgo: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};

const DashboardFilterBar: React.FC<Props> = ({
  filters,
  values,
  loading,
  dirty,
  onChange,
  onApply,
  onReset,
}) => {
  if (filters.length === 0) return null;

  return (
    <form
      className="dashboard-filter-bar"
      onSubmit={(event) => {
        event.preventDefault();
        onApply();
      }}
    >
      {filters.map((filter) => {
        const value = values[filter.id] ?? '';
        const inputId = `filter-${filter.id}`;
        const options = filter.options ?? [];
        // A cross-filter or shared link can carry a value that is not in the
        // configured option list. Show it instead of rendering a blank select.
        const hasUnlistedValue = value !== '' && !options.includes(value);
        return (
          <div className="dashboard-filter" key={filter.id}>
            <label htmlFor={inputId}>{filter.label || filter.id}</label>
            {filter.type === 'select' ? (
              <select
                id={inputId}
                value={value}
                onChange={(event) => onChange(filter.id, event.target.value, filter.type)}
              >
                <option value="">All</option>
                {hasUnlistedValue && <option value={value}>{value}</option>}
                {options.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            ) : (
              <input
                id={inputId}
                type={filter.type === 'number' ? 'number' : filter.type === 'date' ? 'date' : 'text'}
                value={value}
                placeholder={filter.default || undefined}
                onChange={(event) => onChange(filter.id, event.target.value, filter.type)}
              />
            )}
            {filter.type === 'date' && (
              <div className="dashboard-filter-presets">
                {DATE_PRESETS.map((preset) => {
                  const presetValue = localDate(preset.days);
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      className={`dashboard-filter-preset${value === presetValue ? ' dashboard-filter-preset--active' : ''}`}
                      onClick={() => onChange(filter.id, presetValue, filter.type)}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <div className="dashboard-filter-actions">
        <button type="submit" className="filter-apply-btn" disabled={loading}>
          {loading ? 'Loading...' : 'Apply'}
        </button>
        <button type="button" className="filter-reset-btn" onClick={onReset} disabled={loading || !dirty}>
          Reset
        </button>
      </div>
    </form>
  );
};

export default DashboardFilterBar;
