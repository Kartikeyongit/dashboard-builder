import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { fetchQueries } from '../../store/querySlice';
import type { CreateWidgetPayload } from '../../api/dashboard';
import Dialog from '../../ui/Dialog';
import Button from '../../ui/Button';
import Field, { Select } from '../../ui/Field';

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
  const [widgetType, setWidgetType] = useState<'chart' | 'table' | 'metric'>('chart');
  const [chartType, setChartType] = useState('bar');

  useEffect(() => {
    // The editor does not load queries, so the dialog must do it itself.
    if (queries.length === 0) {
      dispatch(fetchQueries());
    }
  }, [dispatch, queries.length]);

  const handleSubmit = () => {
    if (!selectedQueryId) return;
    let config = {};
    if (widgetType === 'chart') {
      config = { chartType };
    }
    onAdd({
      query_id: selectedQueryId,
      widget_type: widgetType,
      config,
      position_x: 0,
      position_y: nextY,
      width: 4,
      height: 4,
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
          onChange={(event) => setWidgetType(event.target.value as 'chart' | 'table' | 'metric')}
        >
          <option value="chart">Chart</option>
          <option value="table">Table</option>
          <option value="metric">Metric</option>
        </Select>
      </Field>

      {widgetType === 'chart' && (
        <Field label="Chart type">
          <Select value={chartType} onChange={(event) => setChartType(event.target.value)}>
            <option value="bar">Bar</option>
            <option value="line">Line</option>
            <option value="pie">Pie</option>
          </Select>
        </Field>
      )}
    </Dialog>
  );
};

export default AddWidgetDialog;
