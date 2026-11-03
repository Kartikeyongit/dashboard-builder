import React from 'react';
import Skeleton from 'react-loading-skeleton';
import type { QueryResult, WidgetConfig } from '../../types';
import { formatMetricValue, metricTone } from '../../utils/widgetConfig';
import './MetricWidget.css';

interface Props {
  data?: QueryResult;
  config?: WidgetConfig | null;
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
  const tone = metricTone(value, config?.threshold);

  return (
    <div className={`metric-widget${tone ? ` metric-widget--${tone}` : ''}`}>
      <div className="metric-widget__value" title={String(value ?? '')}>
        {formatMetricValue(value, config)}
      </div>
      <div className="metric-widget__label">{label}</div>
      {config?.threshold && (
        <div className="metric-widget__threshold">
          {config.threshold.direction === 'below' ? '≤' : '≥'}{' '}
          {formatMetricValue(config.threshold.value, {
            numberFormat: config.numberFormat,
            decimals: config.decimals,
          })}
        </div>
      )}
    </div>
  );
};

export default MetricWidget;
