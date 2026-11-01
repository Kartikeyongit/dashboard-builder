import React from 'react';
import type { QueryResult } from '../../types';
import Skeleton from 'react-loading-skeleton';
import './MetricWidget.css';

interface Props {
  data?: QueryResult;
  config: any;
}

const MetricWidget: React.FC<Props> = ({ data, config }) => {
  // No result yet: keep the footprint stable while the query runs.
  if (!data) return <Skeleton height={80} />;

  if (!data.rows.length) {
    return (
      <div className="metric-widget metric-widget--empty">
        <span className="metric-widget__label">No data returned</span>
      </div>
    );
  }

  const value = data.rows[0][0];
  const label = config?.label || data.columns[0];

  return (
    <div className="metric-widget">
      <div className="metric-widget__value">
        {typeof value === 'number' ? value.toLocaleString() : String(value ?? '—')}
      </div>
      <div className="metric-widget__label">{label}</div>
    </div>
  );
};

export default MetricWidget;
