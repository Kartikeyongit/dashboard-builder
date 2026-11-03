import type {
  ChartType,
  MetricThreshold,
  NumberFormat,
  QueryResult,
  TableDensity,
  ThresholdTone,
  Widget,
  WidgetConfig,
  WidgetPalette,
  WidgetType,
} from '../types';
import { refreshLabel } from './format';

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
}

export const CHART_TYPE_OPTIONS: SelectOption<ChartType>[] = [
  { value: 'bar', label: 'Bar' },
  { value: 'hbar', label: 'Horizontal bar' },
  { value: 'stackedBar', label: 'Stacked bar' },
  { value: 'line', label: 'Line' },
  { value: 'area', label: 'Area' },
  { value: 'pie', label: 'Pie' },
  { value: 'donut', label: 'Donut' },
  { value: 'scatter', label: 'Scatter' },
];

export const NUMBER_FORMAT_OPTIONS: SelectOption<NumberFormat>[] = [
  { value: 'auto', label: 'Automatic' },
  { value: 'integer', label: 'Integer' },
  { value: 'decimal', label: 'Decimal' },
  { value: 'currency', label: 'Currency (USD)' },
  { value: 'percent', label: 'Percent' },
  { value: 'compact', label: 'Compact (1.2K)' },
  { value: 'duration', label: 'Duration (seconds)' },
];

export const PALETTE_OPTIONS: SelectOption<WidgetPalette>[] = [
  { value: 'default', label: 'Default' },
  { value: 'ocean', label: 'Ocean' },
  { value: 'warm', label: 'Warm' },
  { value: 'forest', label: 'Forest' },
  { value: 'mono', label: 'Monochrome' },
];

export const DENSITY_OPTIONS: SelectOption<TableDensity>[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'compact', label: 'Compact' },
];

export const THRESHOLD_DIRECTION_OPTIONS: SelectOption<'above' | 'below'>[] = [
  { value: 'above', label: 'At or above' },
  { value: 'below', label: 'At or below' },
];

export const THRESHOLD_TONE_OPTIONS: SelectOption<ThresholdTone>[] = [
  { value: 'success', label: 'Success (green)' },
  { value: 'warning', label: 'Warning (amber)' },
  { value: 'danger', label: 'Danger (red)' },
];

export const WIDGET_TYPE_LABELS: Record<WidgetType, string> = {
  chart: 'Chart',
  table: 'Table',
  metric: 'Metric',
};

const PALETTES: Record<WidgetPalette, string[]> = {
  default: ['#4f7cff', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'],
  ocean: ['#0369a1', '#0891b2', '#0284c7', '#0ea5e9', '#22d3ee', '#38bdf8'],
  warm: ['#dc2626', '#ea580c', '#f59e0b', '#facc15', '#fb7185', '#e11d48'],
  forest: ['#166534', '#15803d', '#16a34a', '#4d7c0f', '#65a30d', '#84cc16'],
  mono: ['#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1', '#1e293b'],
};

export function paletteColors(palette: WidgetPalette | undefined): string[] {
  return PALETTES[palette ?? 'default'] ?? PALETTES.default;
}

export function chartTypeLabel(type: ChartType | undefined): string {
  return CHART_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? 'Chart';
}

/** Sensible starting values for a freshly created widget. */
export function defaultWidgetConfig(
  widgetType: WidgetType,
  chartType: ChartType = 'bar',
): WidgetConfig {
  switch (widgetType) {
    case 'chart':
      return {
        chartType,
        showLegend: true,
        showLabels: false,
        showGrid: true,
        palette: 'default',
        numberFormat: 'auto',
      };
    case 'table':
      return { density: 'normal', numberFormat: 'auto' };
    case 'metric':
      return { decimals: 0, numberFormat: 'auto' };
    default:
      return {};
  }
}

/**
 * Fills in defaults for rendering. Values stored by older versions of the app
 * (for example a chart with only `chartType`) keep working without migration.
 */
export function normalizeWidgetConfig(
  widgetType: WidgetType,
  config?: WidgetConfig | null,
): WidgetConfig {
  const input = config ?? {};
  return {
    ...defaultWidgetConfig(widgetType, input.chartType),
    ...input,
  };
}

/** Display title for a widget: custom title when set, otherwise its type. */
export function widgetTitle(
  widget: Pick<Widget, 'widget_type' | 'config'>,
  fallback?: string,
): string {
  const title = typeof widget.config?.title === 'string' ? widget.config.title.trim() : '';
  if (title) return title;
  return fallback ?? WIDGET_TYPE_LABELS[widget.widget_type] ?? 'Widget';
}

const numberFormatters = new Map<string, Intl.NumberFormat>();

function formatter(options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = JSON.stringify(options);
  let cached = numberFormatters.get(key);
  if (!cached) {
    cached = new Intl.NumberFormat(undefined, options);
    numberFormatters.set(key, cached);
  }
  return cached;
}

function formatDuration(seconds: number): string {
  const negative = seconds < 0;
  let remaining = Math.abs(Math.round(seconds));
  const days = Math.floor(remaining / 86400);
  remaining -= days * 86400;
  const hours = Math.floor(remaining / 3600);
  remaining -= hours * 3600;
  const minutes = Math.floor(remaining / 60);
  const secs = remaining - minutes * 60;

  let text: string;
  if (days > 0) text = `${days}d ${hours}h`;
  else if (hours > 0) text = `${hours}h ${minutes}m`;
  else if (minutes > 0) text = `${minutes}m ${secs}s`;
  else text = `${secs}s`;

  return negative ? `-${text}` : text;
}

/**
 * Formats a cell or metric value. `percent` treats the stored value as a
 * fraction (0.42 -> 42%), which matches the common SQL aggregate shape.
 */
export function formatNumber(
  value: unknown,
  format: NumberFormat = 'auto',
  decimals?: number,
): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';

  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return String(value);

  switch (format) {
    case 'integer':
      return formatter({ maximumFractionDigits: 0 }).format(num);
    case 'decimal': {
      const digits = decimals ?? 2;
      return formatter({
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }).format(num);
    }
    case 'currency': {
      const digits = decimals ?? 2;
      return formatter({
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }).format(num);
    }
    case 'percent': {
      const digits = decimals ?? 0;
      return formatter({
        style: 'percent',
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }).format(num);
    }
    case 'compact':
      return formatter({
        notation: 'compact',
        maximumFractionDigits: decimals ?? 1,
      }).format(num);
    case 'duration':
      return formatDuration(num);
    case 'auto':
    default:
      return formatter({
        maximumFractionDigits: decimals ?? 2,
      }).format(num);
  }
}

/** Prefix/suffix handling for metric cards. */
export function formatMetricValue(value: unknown, config?: WidgetConfig | null): string {
  if (value === null || value === undefined || value === '') return '—';
  const numeric = typeof value === 'number' ? Number.isFinite(value) : Number.isFinite(Number(value));
  const text = numeric
    ? formatNumber(value, config?.numberFormat ?? 'auto', config?.decimals)
    : String(value);
  return `${config?.prefix ?? ''}${text}${config?.suffix ?? ''}`;
}

/** Returns the tone when the value crosses the configured threshold. */
export function metricTone(value: unknown, threshold?: MetricThreshold | null): ThresholdTone | null {
  if (!threshold) return null;
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return null;
  const hit = threshold.direction === 'below' ? num <= threshold.value : num >= threshold.value;
  return hit ? threshold.tone : null;
}

/** "Inherit (1 min)", "Off", or the override's own label. */
export function refreshOverrideLabel(
  override: number | null | undefined,
  dashboardSeconds: number,
): string {
  if (override === null || override === undefined) {
    return `Inherit (${refreshLabel(dashboardSeconds)})`;
  }
  if (override === 0) return 'Off';
  return refreshLabel(override);
}

export interface ChartTheme {
  text: string;
  muted: string;
  border: string;
  surface: string;
}

/**
 * Builds the ECharts option for a chart widget. Pure so it can be unit tested;
 * the component reads the current theme colors from CSS variables.
 */
export function buildChartOption(
  data: QueryResult | undefined,
  config: WidgetConfig | null | undefined,
  theme: ChartTheme,
): Record<string, unknown> {
  const columns = Array.isArray(data?.columns) ? data.columns : [];
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  const chartType = config?.chartType ?? 'bar';
  const palette = paletteColors(config?.palette);
  const baseTextStyle = { color: theme.text };
  const numberFormat = config?.numberFormat ?? 'auto';
  const showLegend = config?.showLegend !== false;
  const showGrid = config?.showGrid !== false;

  if (rows.length === 0) {
    return {
      title: {
        text: 'No data',
        left: 'center',
        top: 'middle',
        textStyle: { color: theme.muted, fontSize: 12, fontWeight: 400 },
      },
    };
  }

  if (chartType === 'pie' || chartType === 'donut') {
    const pieData = rows.map((row) => ({
      name: String(row[0] ?? ''),
      value: Number(row[1]) || 0,
    }));
    return {
      color: palette,
      tooltip: {
        trigger: 'item',
        backgroundColor: theme.surface,
        borderColor: theme.border,
        textStyle: baseTextStyle,
        valueFormatter: (value: unknown) => formatNumber(value, numberFormat),
      },
      legend: showLegend
        ? { bottom: 0, textStyle: baseTextStyle, icon: 'circle', itemWidth: 8, itemHeight: 8 }
        : { show: false },
      series: [
        {
          type: 'pie',
          radius: chartType === 'donut' ? ['46%', '72%'] : '72%',
          center: ['50%', showLegend ? '46%' : '52%'],
          avoidLabelOverlap: true,
          itemStyle: { borderColor: theme.surface, borderWidth: 2 },
          label: {
            show: config?.showLabels !== false,
            color: theme.text,
            formatter: '{b}',
          },
          labelLine: { show: config?.showLabels !== false },
          data: pieData,
        },
      ],
    };
  }

  const horizontal = chartType === 'hbar';
  const scatter = chartType === 'scatter';
  const isLine = chartType === 'line' || chartType === 'area';
  const seriesType = scatter ? 'scatter' : isLine ? 'line' : 'bar';
  const categories = rows.map((row) => String(row[0] ?? ''));

  const series = columns.slice(1).map((column, index) => {
    const values = rows.map((row) => Number(row[index + 1]) || 0);
    const base: Record<string, unknown> = {
      name: column,
      type: seriesType,
      data: scatter ? values.map((value, i) => [categories[i], value]) : values,
      itemStyle: { color: palette[(index + 1) % palette.length] },
    };
    if (chartType === 'stackedBar') {
      base.stack = 'total';
    }
    if (chartType === 'area') {
      base.areaStyle = { opacity: 0.18 };
      base.smooth = true;
    }
    if (chartType === 'line') {
      base.smooth = true;
    }
    if (scatter) {
      base.symbolSize = 9;
    }
    if (config?.showLabels) {
      base.label = { show: true, color: theme.text, fontSize: 11 };
    }
    return base;
  });

  const categoryAxis = {
    type: 'category' as const,
    data: categories,
    axisLabel: { color: theme.muted, hideOverlap: true },
    axisLine: { lineStyle: { color: theme.border } },
    axisTick: { lineStyle: { color: theme.border } },
    name: horizontal ? config?.yAxisTitle : config?.xAxisTitle,
    nameLocation: 'middle' as const,
    nameGap: 28,
    nameTextStyle: { color: theme.muted, fontSize: 11 },
  };

  const valueAxis = {
    type: 'value' as const,
    axisLabel: {
      color: theme.muted,
      formatter: (value: number) => formatNumber(value, numberFormat),
    },
    splitLine: { show: showGrid, lineStyle: { color: theme.border } },
    axisLine: { show: false },
    axisTick: { show: false },
    name: horizontal ? config?.xAxisTitle : config?.yAxisTitle,
    nameLocation: 'middle' as const,
    nameGap: 38,
    nameTextStyle: { color: theme.muted, fontSize: 11 },
  };

  return {
    color: palette,
    tooltip: {
      trigger: scatter ? 'item' : 'axis',
      backgroundColor: theme.surface,
      borderColor: theme.border,
      textStyle: baseTextStyle,
      valueFormatter: (value: unknown) => formatNumber(value, numberFormat),
    },
    legend: showLegend
      ? {
          top: 0,
          textStyle: baseTextStyle,
          icon: 'circle',
          itemWidth: 8,
          itemHeight: 8,
          type: 'scroll',
        }
      : { show: false },
    grid: {
      left: 8,
      right: 16,
      top: showLegend ? 30 : 14,
      bottom: 8,
      containLabel: true,
    },
    xAxis: horizontal ? valueAxis : categoryAxis,
    yAxis: horizontal ? categoryAxis : valueAxis,
    series,
  };
}
