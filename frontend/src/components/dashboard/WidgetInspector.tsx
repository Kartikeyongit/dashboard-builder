import React, { useCallback, useEffect, useMemo, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type {
  ChartType,
  MetricThreshold,
  NumberFormat,
  TableDensity,
  ThresholdDirection,
  ThresholdTone,
  Widget,
  WidgetConfig,
  WidgetPalette,
} from '../../types';
import {
  CHART_TYPE_OPTIONS,
  DENSITY_OPTIONS,
  NUMBER_FORMAT_OPTIONS,
  PALETTE_OPTIONS,
  THRESHOLD_DIRECTION_OPTIONS,
  THRESHOLD_TONE_OPTIONS,
  normalizeWidgetConfig,
  refreshOverrideLabel,
} from '../../utils/widgetConfig';
import { refreshLabel } from '../../utils/format';
import Button from '../../ui/Button';
import Field, { Input, Select } from '../../ui/Field';
import ConfirmDialog from '../../ui/ConfirmDialog';
import './WidgetInspector.css';

interface InspectorSave {
  config: WidgetConfig;
  refresh_interval_override: number | null;
}

interface Props {
  widget: Widget;
  /** Result columns of the widget's query, used for table column toggles. */
  columns?: string[];
  dashboardRefreshSeconds: number;
  onClose: () => void;
  onSave: (values: InspectorSave) => Promise<void>;
  onDirtyChange: (dirty: boolean) => void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const WidgetInspector: React.FC<Props> = ({
  widget,
  columns = [],
  dashboardRefreshSeconds,
  onClose,
  onSave,
  onDirtyChange,
}) => {
  const [initialConfig] = useState<WidgetConfig>(() =>
    normalizeWidgetConfig(widget.widget_type, widget.config),
  );
  const [draft, setDraft] = useState<WidgetConfig>(initialConfig);
  const [initialRefresh] = useState(() => widget.refresh_interval_override ?? null);
  const [refreshMode, setRefreshMode] = useState<'inherit' | 'off' | 'custom'>(() => {
    const override = widget.refresh_interval_override;
    if (override === null || override === undefined) return 'inherit';
    return override === 0 ? 'off' : 'custom';
  });
  const [refreshSeconds, setRefreshSeconds] = useState(() => {
    const override = widget.refresh_interval_override;
    return typeof override === 'number' && override > 0 ? String(override) : '60';
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const refreshValue = useMemo<number | null>(() => {
    if (refreshMode === 'inherit') return null;
    if (refreshMode === 'off') return 0;
    const parsed = Number(refreshSeconds);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : Number.NaN;
  }, [refreshMode, refreshSeconds]);

  const refreshError = useMemo(() => {
    if (refreshMode !== 'custom') return '';
    if (!Number.isFinite(refreshValue as number)) return 'Enter a whole number of seconds.';
    if ((refreshValue as number) < 5 || (refreshValue as number) > 86400) {
      return 'Refresh must be between 5 seconds and 24 hours.';
    }
    return '';
  }, [refreshMode, refreshValue]);

  const dirty = useMemo(
    () =>
      JSON.stringify(draft) !== JSON.stringify(initialConfig) ||
      refreshValue !== initialRefresh,
    [draft, initialConfig, refreshValue, initialRefresh],
  );

  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

  const update = useCallback((patch: Partial<WidgetConfig>) => {
    setDraft((current) => ({ ...current, ...patch }));
  }, []);

  const toggleVisibleColumn = useCallback((column: string) => {
    setDraft((current) => {
      const existing = Array.isArray(current.visibleColumns) ? current.visibleColumns : [];
      const active = existing.length === 0 || existing.some((value) => value.toLowerCase() === column.toLowerCase());
      let next: string[];
      if (existing.length === 0) {
        // "All columns" is the default. Toggling one column off means every
        // other column becomes an explicit selection.
        next = columns.filter((value) => value.toLowerCase() !== column.toLowerCase());
      } else if (active) {
        next = existing.filter((value) => value.toLowerCase() !== column.toLowerCase());
      } else {
        next = [...existing, column];
      }
      return { ...current, visibleColumns: next };
    });
  }, [columns]);

  const isColumnVisible = useCallback(
    (column: string) => {
      const configured = draft.visibleColumns;
      if (!Array.isArray(configured) || configured.length === 0) return true;
      return configured.some((value) => value.toLowerCase() === column.toLowerCase());
    },
    [draft.visibleColumns],
  );

  const handleClose = () => {
    if (saving) return;
    if (dirty) {
      setConfirmDiscard(true);
      return;
    }
    onClose();
  };

  const handleSave = async () => {
    if (refreshError) return;
    setSaving(true);
    setError('');
    try {
      await onSave({
        config: draft,
        refresh_interval_override: refreshValue,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this widget.');
    } finally {
      setSaving(false);
    }
  };

  const widgetType = widget.widget_type;
  const threshold = isRecord(draft.threshold) ? (draft.threshold as MetricThreshold) : undefined;

  return (
    <>
      <DialogPrimitive.Root
        open
        onOpenChange={(next) => {
          if (!next) handleClose();
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="widget-inspector__overlay" />
          <DialogPrimitive.Content className="widget-inspector" aria-describedby={undefined}>
            <div className="widget-inspector__header">
              <div>
                <DialogPrimitive.Title className="widget-inspector__title">
                  Edit {widgetType}
                </DialogPrimitive.Title>
                <p className="widget-inspector__subtitle">
                  Changes apply to this widget only.
                </p>
              </div>
              <button
                type="button"
                className="widget-inspector__close"
                onClick={handleClose}
                aria-label="Close inspector"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="widget-inspector__body">
              <section className="widget-inspector__section">
                <h3 className="widget-inspector__section-title">Display</h3>
                <Field label="Title" hint="Shown above the widget. Leave empty to use the widget type.">
                  <Input
                    value={draft.title ?? ''}
                    maxLength={120}
                    placeholder="Optional title"
                    onChange={(event) => update({ title: event.target.value })}
                  />
                </Field>
                <Field
                  label="Number format"
                  hint={draft.numberFormat === 'percent' ? 'Percent treats 0.25 as 25%.' : undefined}
                >
                  <Select
                    value={draft.numberFormat ?? 'auto'}
                    onChange={(event) => update({ numberFormat: event.target.value as NumberFormat })}
                  >
                    {NUMBER_FORMAT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </section>

              {widgetType === 'chart' && (
                <section className="widget-inspector__section">
                  <h3 className="widget-inspector__section-title">Chart</h3>
                  <Field label="Chart type">
                    <Select
                      value={draft.chartType ?? 'bar'}
                      onChange={(event) => update({ chartType: event.target.value as ChartType })}
                    >
                      {CHART_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Color palette">
                    <Select
                      value={draft.palette ?? 'default'}
                      onChange={(event) => update({ palette: event.target.value as WidgetPalette })}
                    >
                      {PALETTE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <div className="widget-inspector__checks">
                    <label className="widget-inspector__check">
                      <input
                        type="checkbox"
                        checked={draft.showLegend !== false}
                        onChange={(event) => update({ showLegend: event.target.checked })}
                      />
                      Show legend
                    </label>
                    <label className="widget-inspector__check">
                      <input
                        type="checkbox"
                        checked={draft.showGrid !== false}
                        onChange={(event) => update({ showGrid: event.target.checked })}
                      />
                      Show gridlines
                    </label>
                    <label className="widget-inspector__check">
                      <input
                        type="checkbox"
                        checked={draft.showLabels === true}
                        onChange={(event) => update({ showLabels: event.target.checked })}
                      />
                      Show value labels
                    </label>
                  </div>
                  <div className="widget-inspector__two-up">
                    <Field label="X-axis title">
                      <Input
                        value={draft.xAxisTitle ?? ''}
                        maxLength={60}
                        placeholder="Optional"
                        onChange={(event) => update({ xAxisTitle: event.target.value })}
                      />
                    </Field>
                    <Field label="Y-axis title">
                      <Input
                        value={draft.yAxisTitle ?? ''}
                        maxLength={60}
                        placeholder="Optional"
                        onChange={(event) => update({ yAxisTitle: event.target.value })}
                      />
                    </Field>
                  </div>
                </section>
              )}

              {widgetType === 'table' && (
                <section className="widget-inspector__section">
                  <h3 className="widget-inspector__section-title">Table</h3>
                  <Field label="Density">
                    <Select
                      value={draft.density ?? 'normal'}
                      onChange={(event) => update({ density: event.target.value as TableDensity })}
                    >
                      {DENSITY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <label className="widget-inspector__check">
                    <input
                      type="checkbox"
                      checked={draft.pinFirstColumn === true}
                      onChange={(event) => update({ pinFirstColumn: event.target.checked })}
                    />
                    Pin the first column
                  </label>
                  <Field
                    label="Visible columns"
                    hint={
                      columns.length === 0
                        ? 'Run the widget first to load its columns.'
                        : 'All columns are shown unless you select a subset.'
                    }
                  >
                    <div className="widget-inspector__columns">
                      {columns.length === 0 && (
                        <span className="widget-inspector__muted">No columns available.</span>
                      )}
                      {columns.map((column) => (
                        <label key={column} className="widget-inspector__check">
                          <input
                            type="checkbox"
                            checked={isColumnVisible(column)}
                            onChange={() => toggleVisibleColumn(column)}
                          />
                          {column}
                        </label>
                      ))}
                      {columns.length > 0 && draft.visibleColumns && draft.visibleColumns.length > 0 && (
                        <button
                          type="button"
                          className="widget-inspector__link"
                          onClick={() => update({ visibleColumns: undefined })}
                        >
                          Show all columns
                        </button>
                      )}
                    </div>
                  </Field>
                </section>
              )}

              {widgetType === 'metric' && (
                <section className="widget-inspector__section">
                  <h3 className="widget-inspector__section-title">Metric</h3>
                  <Field label="Label" hint="Defaults to the query's first column name.">
                    <Input
                      value={draft.label ?? ''}
                      maxLength={120}
                      placeholder="Optional label"
                      onChange={(event) => update({ label: event.target.value })}
                    />
                  </Field>
                  <div className="widget-inspector__two-up">
                    <Field label="Prefix">
                      <Input
                        value={draft.prefix ?? ''}
                        maxLength={16}
                        placeholder="$"
                        onChange={(event) => update({ prefix: event.target.value })}
                      />
                    </Field>
                    <Field label="Suffix">
                      <Input
                        value={draft.suffix ?? ''}
                        maxLength={16}
                        placeholder="%"
                        onChange={(event) => update({ suffix: event.target.value })}
                      />
                    </Field>
                  </div>
                  <Field label="Decimals">
                    <Input
                      type="number"
                      min={0}
                      max={6}
                      value={draft.decimals ?? 0}
                      onChange={(event) => update({ decimals: Number(event.target.value) })}
                    />
                  </Field>
                  <label className="widget-inspector__check">
                    <input
                      type="checkbox"
                      checked={Boolean(threshold)}
                      onChange={(event) =>
                        update({
                          threshold: event.target.checked
                            ? threshold ?? { value: 0, direction: 'above', tone: 'danger' }
                            : undefined,
                        })
                      }
                    />
                    Highlight values crossing a threshold
                  </label>
                  {threshold && (
                    <div className="widget-inspector__threshold">
                      <Field label="Threshold value">
                        <Input
                          type="number"
                          value={threshold.value}
                          onChange={(event) =>
                            update({ threshold: { ...threshold, value: Number(event.target.value) } })
                          }
                        />
                      </Field>
                      <Field label="Direction">
                        <Select
                          value={threshold.direction}
                          onChange={(event) =>
                            update({
                              threshold: {
                                ...threshold,
                                direction: event.target.value as ThresholdDirection,
                              },
                            })
                          }
                        >
                          {THRESHOLD_DIRECTION_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="Tone">
                        <Select
                          value={threshold.tone}
                          onChange={(event) =>
                            update({
                              threshold: {
                                ...threshold,
                                tone: event.target.value as ThresholdTone,
                              },
                            })
                          }
                        >
                          {THRESHOLD_TONE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </Select>
                      </Field>
                    </div>
                  )}
                </section>
              )}

              <section className="widget-inspector__section">
                <h3 className="widget-inspector__section-title">Refresh</h3>
                <Field
                  label="Widget refresh"
                  hint={`Dashboard default: ${refreshLabel(dashboardRefreshSeconds)}. ${refreshOverrideLabel(initialRefresh, dashboardRefreshSeconds)} currently.`}
                  error={refreshError || undefined}
                >
                  <Select
                    value={refreshMode}
                    onChange={(event) =>
                      setRefreshMode(event.target.value as 'inherit' | 'off' | 'custom')
                    }
                  >
                    <option value="inherit">Inherit dashboard interval</option>
                    <option value="off">Never refresh</option>
                    <option value="custom">Custom interval</option>
                  </Select>
                </Field>
                {refreshMode === 'custom' && (
                  <Field label="Seconds" hint="Between 5 seconds and 86,400 seconds (24 hours).">
                    <Input
                      type="number"
                      min={5}
                      max={86400}
                      value={refreshSeconds}
                      onChange={(event) => setRefreshSeconds(event.target.value)}
                    />
                  </Field>
                )}
              </section>
            </div>

            <div className="widget-inspector__footer">
              {error && <p className="widget-inspector__error" role="alert">{error}</p>}
              <div className="widget-inspector__actions">
                <Button variant="secondary" onClick={handleClose} disabled={saving}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSave}
                  loading={saving}
                  disabled={!dirty || Boolean(refreshError)}
                >
                  Save changes
                </Button>
              </div>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <ConfirmDialog
        open={confirmDiscard}
        title="Discard unsaved changes?"
        description="Your widget changes have not been saved."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        destructive
        onConfirm={() => {
          setConfirmDiscard(false);
          onClose();
        }}
        onCancel={() => setConfirmDiscard(false)}
      />
    </>
  );
};

export default WidgetInspector;
