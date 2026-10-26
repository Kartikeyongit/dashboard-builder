import React from 'react';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { QueryResult } from '../../types';

// Register only the pieces the dashboard charts use. Importing all of ECharts
// pulls in every chart type, component, and renderer, which triples the size of
// this lazy chunk.
echarts.use([
  BarChart,
  LineChart,
  PieChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  CanvasRenderer,
]);

interface Props {
  data?: QueryResult;
  config: any;
}

const ChartWidget: React.FC<Props> = ({ data, config }) => {
  const chartType = config?.chartType || 'bar';

  const option = buildEChartsOption(chartType, data);

  return (
    <ReactEChartsCore
      echarts={echarts}
      option={option}
      style={{ height: '100%', width: '100%' }}
      notMerge={true}
    />
  );
};

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function buildEChartsOption(type: string, data?: QueryResult) {
  const textColor = cssVar('--color-text');
  const mutedColor = cssVar('--color-text-muted');
  const borderColor = cssVar('--color-border');
  const surfaceColor = cssVar('--color-surface');

  const columns = data?.columns ?? [];
  const rows = data?.rows ?? [];

  const baseTextStyle = { color: textColor };

  if (type === 'pie') {
    const pieData = rows.map((row) => ({
      name: row[0] ?? '',
      value: Number(row[1]) || 0,
    }));
    return {
      tooltip: { trigger: 'item', backgroundColor: surfaceColor, textStyle: baseTextStyle },
      series: [{ type: 'pie', data: pieData, label: baseTextStyle }],
    };
  }

  const categories = rows.map((row) => row[0] ?? '');
  const series = columns.slice(1).map((col, idx) => ({
    name: col,
    type: type,
    data: rows.map((row) => Number(row[idx + 1]) || 0),
  }));

  return {
    tooltip: { backgroundColor: surfaceColor, textStyle: baseTextStyle },
    legend: { data: columns.slice(1), textStyle: baseTextStyle },
    grid: { containLabel: true },
    xAxis: {
      data: categories,
      axisLabel: { color: mutedColor },
      axisLine: { lineStyle: { color: borderColor } },
      axisTick: { lineStyle: { color: borderColor } },
    },
    yAxis: {
      axisLabel: { color: mutedColor },
      splitLine: { lineStyle: { color: borderColor } },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series,
  };
}

export default ChartWidget;