import React, { useState, useEffect } from 'react';
import { useAppSelector } from '../../hooks';
import type { CreateWidgetPayload } from '../../api/dashboard';
import Dropdown from '../ui/Dropdown';
import './AddWidgetDialog.css';

interface Props {
  onClose: () => void;
  onAdd: (payload: CreateWidgetPayload) => void;
}

const AddWidgetDialog: React.FC<Props> = ({ onClose, onAdd }) => {
  const queries = useAppSelector((state) => state.queries.items);
  const [selectedQueryId, setSelectedQueryId] = useState('');
  const [widgetType, setWidgetType] = useState<'chart' | 'table' | 'metric'>('chart');
  const [chartType, setChartType] = useState('bar');

  useEffect(() => {
    // queries are loaded by the parent (DashboardEditor)
  }, []);

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
      position_y: Infinity,
      width: 4,
      height: 4,
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Add Widget</h3>

        <div className="modal-field">
          <label>Query</label>
          <Dropdown
            value={selectedQueryId}
            onChange={setSelectedQueryId}
            options={[
              { value: '', label: 'Select a query' },
              ...queries.map(q => ({ value: q.id, label: q.name })),
            ]}
            placeholder="Select a query"
          />
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
          <button className="modal-btn modal-btn--primary" onClick={handleSubmit}>
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