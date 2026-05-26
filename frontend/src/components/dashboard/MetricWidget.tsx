import React from 'react';
import type { QueryResult } from '../../types';
import Skeleton from 'react-loading-skeleton';

interface Props {
  data?: QueryResult;
  config: any;
}

const MetricWidget: React.FC<Props> = ({ data, config }) => {
  if (!data || !data.rows.length) return <Skeleton height={80} />;
  // Display the first value of the first row as a big number; config could specify column.
  const value = data.rows[0][0];
  const label = config.label || data.columns[0];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div style={{ fontSize: '2em', fontWeight: 'bold' }}>{value}</div>
      <div>{label}</div>
    </div>
  );
};

export default MetricWidget;
