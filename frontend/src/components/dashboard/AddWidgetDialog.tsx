import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { fetchQueries } from '../../store/querySlice';
import type { CreateWidgetPayload } from '../../api/dashboard';
import Dropdown from '../ui/Dropdown';
import '../ui/Modal.css';

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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add Widget
        </h3>

        <div className="modal-field">
          <label>Query</label>
          <Dropdown
            value={selectedQueryId}
            onChange={setSelectedQueryId}
            options={[
              { value: '', label: queriesLoading ? 'Loading queries...' : 'Select a query' },
              ...queries.map(q => ({ value: q.id, label: q.name })),
            ]}
            placeholder="Select a query"
          />
          {!queriesLoading && queries.length === 0 && (
            <p className="modal-hint">
              No queries yet. Create a query first, then add it as a widget.
            </p>
          )}
        </div>

        <div className="modal-field">
          <label>Widget type</label>
          <Dropdown
            value={widgetType}
            onChange={(v) => setWidgetType(v as 'chart' | 'table' | 'metric')}
            options={[
              { value: 'chart', label: 'Chart' },
              { value: 'table', label: 'Table' },
              { value: 'metric', label: 'Metric' },
            ]}
          />
        </div>

        {widgetType === 'chart' && (
          <div className="modal-field">
            <label>Chart type</label>
            <Dropdown
              value={chartType}
              onChange={setChartType}
              options={[
                { value: 'bar', label: 'Bar' },
                { value: 'line', label: 'Line' },
                { value: 'pie', label: 'Pie' },
              ]}
            />
          </div>
        )}

        <div className="modal-actions">
          <button
            className="modal-btn modal-btn--primary"
            onClick={handleSubmit}
            disabled={!selectedQueryId}
          >
            Add Widget
          </button>
          <button className="modal-btn modal-btn--secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddWidgetDialog;
