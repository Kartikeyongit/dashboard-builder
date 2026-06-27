import React from 'react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import type { QueryResult } from '../../types';

ModuleRegistry.registerModules([AllCommunityModule]);

const agGridTheme = {
  '--ag-background-color': 'var(--color-surface)',
  '--ag-foreground-color': 'var(--color-text)',
  '--ag-header-background-color': 'var(--color-bg)',
  '--ag-header-foreground-color': 'var(--color-text)',
  '--ag-border-color': 'var(--color-border)',
  '--ag-row-hover-color': 'var(--color-surface-hover)',
  '--ag-odd-row-background-color': 'rgba(0,0,0,0.02)',
  '--ag-input-focus-border-color': 'var(--color-primary)',
} as React.CSSProperties;

interface Props {
  data?: QueryResult;
}

const TableWidget: React.FC<Props> = ({ data }) => {
  const columns = Array.isArray(data?.columns) ? data.columns : [];
  const rows = Array.isArray(data?.rows) ? data.rows : [];

  if (columns.length === 0) {
    return (
      <div style={{ padding: 12, color: '#64748b' }}>
        No table columns returned by this query.
      </div>
    );
  }

  const columnDefs = columns.map((col) => ({
    field: col,
    sortable: true,
    filter: true,
    resizable: true,
    flex: 1,
    minWidth: 120,
  }));
  const rowData = rows.map((row) => {
    const obj: any = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });

  return (
    <div className="ag-theme-alpine" style={{ height: '100%', minHeight: 180, width: '100%', ...agGridTheme }}>
      <AgGridReact
        columnDefs={columnDefs}
        rowData={rowData}
        defaultColDef={{ resizable: true }}
        overlayNoRowsTemplate="<span>No rows returned by this query.</span>"
      />
    </div>
  );
};

export default TableWidget;
