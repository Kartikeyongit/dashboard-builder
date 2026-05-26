import React from 'react';
import ReactECharts from 'echarts-for-react';
import type { QueryResult } from '../../types';

interface Props {
  data?: QueryResult;
  config: any;
}

const ChartWidget: React.FC<Props> = ({ data, config }) => {
  const chartType = config?.chartType || 'bar';

  // Always build option, even with empty data
  const option = buildEChartsOption(chartType, data);

  return (
    <ReactECharts
      option={option}
      style={{ height: '100%', width: '100%' }}
      notMerge={true}
    />
  );
};

function buildEChartsOption(type: string, data?: QueryResult) {
  const columns = data?.columns ?? [];
  const rows = data?.rows ?? [];   // safe now, but fallback to empty array

  if (type === 'pie') {
    const pieData = rows.map((row) => ({
      name: row[0] ?? '',
      value: Number(row[1]) || 0,
    }));
    return {
      tooltip: { trigger: 'item' },
      series: [{ type: 'pie', data: pieData }],
    };
  }

  const categories = rows.map((row) => row[0] ?? '');
  const series = columns.slice(1).map((col, idx) => ({
    name: col,
    type: type,
    data: rows.map((row) => Number(row[idx + 1]) || 0),
  }));

  return {
    tooltip: {},
    legend: { data: columns.slice(1) },
    xAxis: { data: categories },
    yAxis: {},
    series,
  };
}

export default ChartWidget;