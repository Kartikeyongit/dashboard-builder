import React, { useState, useEffect } from 'react';
import { useAppSelector } from '../../hooks';
import type { CreateWidgetPayload } from '../../api/dashboard';
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
          <select value={selectedQueryId} onChange={e => setSelectedQueryId(e.target.value)}>
            <option value="">Select a query</option>
            {queries.map(q => (
              <option key={q.id} value={q.id}>{q.name}</option>
            ))}
          </select>
        </div>

        <div className="modal-field">
          <label>Widget type</label>
          <select value={widgetType} onChange={e => setWidgetType(e.target.value as any)}>
            <option value="chart">Chart</option>
            <option value="table">Table</option>
            <option value="metric">Metric</option>
          </select>
        </div>

        {widgetType === 'chart' && (
          <div className="modal-field">
            <label>Chart type</label>
            <select value={chartType} onChange={e => setChartType(e.target.value)}>
              <option value="bar">Bar</option>
              <option value="line">Line</option>
              <option value="pie">Pie</option>
            </select>
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