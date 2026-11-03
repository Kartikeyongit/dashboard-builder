import React, { useMemo } from 'react';
// Use the package's ESM build. Its `lib/core` CommonJS build resolves to the
// module object under Rolldown's production interop, which triggers React
// error #130 (invalid element type) even though the dev server works.
import ReactEChartsCore from 'echarts-for-react/esm/core';
import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart, ScatterChart } from 'echarts/charts';
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useTheme } from '../../theme/useTheme';
import type { QueryResult, WidgetConfig } from '../../types';
import { buildChartOption } from '../../utils/widgetConfig';
import type { ChartTheme } from '../../utils/widgetConfig';

// Register only the pieces the dashboard charts use. Importing all of ECharts
// pulls in every chart type, component, and renderer, which triples the size of
// this lazy chunk.
echarts.use([
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
  CanvasRenderer,
]);

type ChartClickParams = {
  componentType?: string;
  name?: string | number;
};

interface Props {
  data?: QueryResult;
  config?: WidgetConfig | null;
  /**
   * Called when a data point is clicked. `column` is the chart's first result
   * column and `value` is the clicked category/slice name. DashboardView maps
   * that pair onto an existing dashboard filter.
   */
  onSelect?: (column: string, value: string) => void;
}

const ChartWidget: React.FC<Props> = ({ data, config, onSelect }) => {
  const { resolved: theme } = useTheme();
  const dimensionColumn = data?.columns?.[0];
  const interactive = Boolean(onSelect && dimensionColumn);

  // Rebuild when the theme or config changes so colors, labels, and axes stay
  // in sync without a data refetch. `buildChartOption` reads CSS variables, so
  // the resolved theme is read here to make the dependency explicit.
  const option = useMemo(() => {
    void theme;
    const colors: ChartTheme = {
      text: cssVar('--color-text'),
      muted: cssVar('--color-text-muted'),
      border: cssVar('--color-border'),
      surface: cssVar('--color-surface'),
    };
    return buildChartOption(data, config, colors);
  }, [config, data, theme]);

  const onEvents = interactive
    ? {
        click: (params: ChartClickParams) => {
          // Ignore legend/title clicks; only data points carry a category.
          if (params?.componentType !== 'series') return;
          if (params.name === undefined || params.name === null || params.name === '') return;
          onSelect?.(String(dimensionColumn), String(params.name));
        },
      }
    : undefined;

  return (
    <ReactEChartsCore
      echarts={echarts}
      option={option}
      style={{ height: '100%', width: '100%', cursor: interactive ? 'pointer' : 'default' }}
      notMerge={true}
      onEvents={onEvents}
    />
  );
};

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export default ChartWidget;
