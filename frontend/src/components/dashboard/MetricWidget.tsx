import React from 'react';
import type { QueryResult } from '../../types';
import Skeleton from 'react-loading-skeleton';

interface Props {
  data?: QueryResult;
  config: any;
}

const MetricWidget: React.FC<Props> = ({ data, config }) => {
  if (!data || !data.rows.length) return <Skeleton height={80} />;
  const value = data.rows[0][0];
  const label = config.label || data.columns[0];
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      gap: '0.25rem',
    }}>
      <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.1 }}>
        {typeof value === 'number' ? value.toLocaleString() : String(value)}
      </div>
      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
        {label}
      </div>
    </div>
  );
};

export default MetricWidget;
