import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { fetchQueries } from '../../store/querySlice';
import type { CreateWidgetPayload } from '../../api/dashboard';
import type { ChartType, WidgetType } from '../../types';
import { CHART_TYPE_OPTIONS, defaultWidgetConfig } from '../../utils/widgetConfig';
import Dialog from '../../ui/Dialog';
import Button from '../../ui/Button';
import Field, { Input, Select } from '../../ui/Field';

interface Props {
  onClose: () => void;
  onAdd: (payload: CreateWidgetPayload) => void;
  /** Row where the new widget should be placed so it never overlaps existing ones. */
  nextY?: number;
}

const AddWidgetDialog: React.FC<Props> = ({ onClose, onAdd, nextY = 0 }) => {
  const dispatch = useAppDispatch();
  const queries = useAppSelector((state) => state.queries.items);
  const queriesLoading = useAppSelector((state) => state.queries.loading);
  const [selectedQueryId, setSelectedQueryId] = useState('');
  const [widgetType, setWidgetType] = useState<WidgetType>('chart');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [title, setTitle] = useState('');

  useEffect(() => {
    // The editor does not load queries, so the dialog must do it itself.
    if (queries.length === 0) {
      dispatch(fetchQueries());
    }
  }, [dispatch, queries.length]);

  const handleSubmit = () => {
    if (!selectedQueryId) return;
    const config = {
      ...defaultWidgetConfig(widgetType, chartType),
      ...(title.trim() ? { title: title.trim() } : {}),
    };
    onAdd({
      query_id: selectedQueryId,
      widget_type: widgetType,
      config,
      position_x: 0,
      position_y: nextY,
      width: widgetType === 'metric' ? 3 : 4,
      height: widgetType === 'metric' ? 3 : 4,
    });
    onClose();
  };

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title="Add widget"
      description="Choose a saved query, then how its results should be displayed."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={!selectedQueryId}>
            <Plus size={14} aria-hidden="true" />
            Add widget
          </Button>
        </>
      }
    >
      <Field
        label="Query"
        hint={
          !queriesLoading && queries.length === 0
            ? 'No queries yet. Create a query first, then add it as a widget.'
            : undefined
        }
      >
        <Select
          value={selectedQueryId}
          onChange={(event) => setSelectedQueryId(event.target.value)}
        >
          <option value="">
            {queriesLoading ? 'Loading queries…' : 'Select a query'}
          </option>
          {queries.map((query) => (
            <option key={query.id} value={query.id}>
              {query.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Widget type">
        <Select
          value={widgetType}
          onChange={(event) => setWidgetType(event.target.value as WidgetType)}
        >
          <option value="chart">Chart</option>
          <option value="table">Table</option>
          <option value="metric">Metric</option>
        </Select>
      </Field>

      {widgetType === 'chart' && (
        <Field label="Chart type">
          <Select
            value={chartType}
            onChange={(event) => setChartType(event.target.value as ChartType)}
          >
            {CHART_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
      )}

      <Field label="Title" hint="Optional. Shown above the widget in the editor and viewer.">
        <Input
          value={title}
          maxLength={120}
          placeholder={widgetType === 'chart' ? 'e.g. Revenue by month' : 'Optional title'}
          onChange={(event) => setTitle(event.target.value)}
        />
      </Field>
    </Dialog>
  );
};

export default AddWidgetDialog;
