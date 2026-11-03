import { describe, expect, it } from 'vitest';
import {
  buildChartOption,
  chartTypeLabel,
  defaultWidgetConfig,
  formatMetricValue,
  formatNumber,
  metricTone,
  normalizeWidgetConfig,
  paletteColors,
  refreshOverrideLabel,
  widgetTitle,
} from './widgetConfig';
import type { ChartTheme } from './widgetConfig';
import type { QueryResult } from '../types';

const theme: ChartTheme = {
  text: '#111827',
  muted: '#6b7280',
  border: '#e5e7eb',
  surface: '#ffffff',
};

interface ChartSeries {
  type?: string;
  stack?: string;
  areaStyle?: unknown;
  radius?: unknown;
}

interface ChartOption {
  series: ChartSeries[];
  xAxis: { type?: string; data?: unknown[] };
  yAxis: { type?: string; splitLine?: { show?: boolean } };
  legend: { show?: boolean };
  title: { text?: string };
}

const chartOption = (value: Record<string, unknown>) => value as unknown as ChartOption;

const data: QueryResult = {
  columns: ['month', 'revenue', 'costs'],
  rows: [
    ['Jan', 1200, 800],
    ['Feb', 1500, 900],
  ],
};

describe('formatNumber', () => {
  it('formats common number formats', () => {
    expect(formatNumber(1234.567, 'integer')).toBe('1,235');
    expect(formatNumber(1234.5, 'decimal', 1)).toBe('1,234.5');
    expect(formatNumber(0.425, 'percent')).toContain('43');
    expect(formatNumber(1234, 'compact')).toBe('1.2K');
    expect(formatNumber(90, 'duration')).toBe('1m 30s');
    expect(formatNumber(3725, 'duration')).toBe('1h 2m');
  });

  it('handles empty and non-numeric values', () => {
    expect(formatNumber(null)).toBe('—');
    expect(formatNumber(undefined)).toBe('—');
    expect(formatNumber('')).toBe('—');
    expect(formatNumber('not a number')).toBe('not a number');
    expect(formatNumber(true)).toBe('Yes');
  });

  it('formats currency with USD', () => {
    expect(formatNumber(12.5, 'currency')).toContain('$');
    expect(formatNumber(12.5, 'currency')).toContain('12.50');
  });
});

describe('formatMetricValue', () => {
  it('applies prefix, suffix, and decimals', () => {
    expect(formatMetricValue(1234.5, { numberFormat: 'decimal', decimals: 1, prefix: '$', suffix: 'k' })).toBe(
      '$1,234.5k',
    );
  });

  it('leaves plain strings alone', () => {
    expect(formatMetricValue('healthy', { prefix: '' })).toBe('healthy');
  });
});

describe('metricTone', () => {
  it('matches above and below thresholds', () => {
    expect(metricTone(12, { value: 10, direction: 'above', tone: 'success' })).toBe('success');
    expect(metricTone(8, { value: 10, direction: 'above', tone: 'success' })).toBeNull();
    expect(metricTone(8, { value: 10, direction: 'below', tone: 'danger' })).toBe('danger');
  });

  it('ignores non-numeric values and missing thresholds', () => {
    expect(metricTone('n/a', { value: 10, direction: 'above', tone: 'danger' })).toBeNull();
    expect(metricTone(10, null)).toBeNull();
  });
});

describe('widget config defaults', () => {
  it('fills defaults for legacy chart configs', () => {
    const config = normalizeWidgetConfig('chart', { chartType: 'line' });
    expect(config.chartType).toBe('line');
    expect(config.showLegend).toBe(true);
    expect(config.showGrid).toBe(true);
    expect(config.palette).toBe('default');
  });

  it('does not leak chart defaults into metrics', () => {
    const config = normalizeWidgetConfig('metric', { label: 'Users' });
    expect(config.label).toBe('Users');
    expect(config.chartType).toBeUndefined();
    expect(config.decimals).toBe(0);
  });

  it('provides sensible defaults per type', () => {
    expect(defaultWidgetConfig('chart').chartType).toBe('bar');
    expect(defaultWidgetConfig('table').density).toBe('normal');
    expect(defaultWidgetConfig('metric').numberFormat).toBe('auto');
  });
});

describe('widgetTitle', () => {
  it('prefers the configured title', () => {
    expect(widgetTitle({ widget_type: 'chart', config: { title: '  Revenue  ' } })).toBe('Revenue');
  });

  it('falls back to the widget type label', () => {
    expect(widgetTitle({ widget_type: 'table', config: {} })).toBe('Table');
    expect(widgetTitle({ widget_type: 'metric', config: null }, 'Fallback')).toBe('Fallback');
  });
});

describe('refreshOverrideLabel', () => {
  it('describes inherited, off, and custom intervals', () => {
    expect(refreshOverrideLabel(undefined, 60)).toBe('Inherit (1 min)');
    expect(refreshOverrideLabel(null, 60)).toBe('Inherit (1 min)');
    expect(refreshOverrideLabel(0, 60)).toBe('Off');
    expect(refreshOverrideLabel(30, 60)).toBe('30s');
  });
});

describe('paletteColors', () => {
  it('returns a non-empty palette and falls back for unknown values', () => {
    expect(paletteColors('ocean').length).toBeGreaterThan(0);
    expect(paletteColors(undefined)).toEqual(paletteColors('default'));
  });
});

describe('buildChartOption', () => {
  it('renders a cartesian bar chart with one series per metric column', () => {
    const option = chartOption(buildChartOption(data, { chartType: 'bar' }, theme));
    expect(option.series).toHaveLength(2);
    expect(option.series[0].type).toBe('bar');
    expect(option.xAxis.data).toEqual(['Jan', 'Feb']);
    expect(option.yAxis.splitLine?.show).toBe(true);
  });

  it('stacks stacked bars', () => {
    const option = chartOption(buildChartOption(data, { chartType: 'stackedBar' }, theme));
    expect(option.series.every((series) => series.stack === 'total')).toBe(true);
  });

  it('uses a line series with an area for area charts', () => {
    const option = chartOption(buildChartOption(data, { chartType: 'area' }, theme));
    expect(option.series[0].type).toBe('line');
    expect(option.series[0].areaStyle).toBeTruthy();
  });

  it('builds a donut with an inner radius and hides the legend when asked', () => {
    const option = chartOption(
      buildChartOption(
        { columns: ['country', 'users'], rows: [['US', 10], ['DE', 4]] },
        { chartType: 'donut', showLegend: false },
        theme,
      ),
    );
    expect(option.series[0].type).toBe('pie');
    expect(option.series[0].radius).toEqual(['46%', '72%']);
    expect(option.legend.show).toBe(false);
  });

  it('swaps axes for horizontal bars', () => {
    const option = chartOption(buildChartOption(data, { chartType: 'hbar' }, theme));
    expect(option.xAxis.type).toBe('value');
    expect(option.yAxis.type).toBe('category');
  });

  it('shows a no-data title for an empty result', () => {
    const option = chartOption(buildChartOption({ columns: [], rows: [] }, { chartType: 'bar' }, theme));
    expect(option.title.text).toBe('No data');
  });

  it('labels chart types', () => {
    expect(chartTypeLabel('stackedBar')).toBe('Stacked bar');
    expect(chartTypeLabel(undefined)).toBe('Chart');
  });
});
