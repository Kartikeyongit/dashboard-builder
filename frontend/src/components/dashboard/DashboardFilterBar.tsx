import React from 'react';
import type { DashboardFilter, DashboardFilterValues } from '../../types';

interface Props {
  filters: DashboardFilter[];
  values: DashboardFilterValues;
  loading?: boolean;
  dirty?: boolean;
  onChange: (id: string, value: string) => void;
  onApply: () => void;
  onReset: () => void;
}

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
        return (
          <div className="dashboard-filter" key={filter.id}>
            <label htmlFor={inputId}>{filter.label || filter.id}</label>
            {filter.type === 'select' ? (
              <select
                id={inputId}
                value={value}
                onChange={(event) => onChange(filter.id, event.target.value)}
              >
                <option value="">All</option>
                {(filter.options ?? []).map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            ) : (
              <input
                id={inputId}
                type={filter.type === 'number' ? 'number' : filter.type === 'date' ? 'date' : 'text'}
                value={value}
                placeholder={filter.default || undefined}
                onChange={(event) => onChange(filter.id, event.target.value)}
              />
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
