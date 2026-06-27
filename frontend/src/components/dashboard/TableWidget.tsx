import React from 'react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import type { QueryResult } from '../../types';

ModuleRegistry.registerModules([AllCommunityModule]);

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
    <div className="ag-theme-alpine" style={{ height: '100%', minHeight: 180, width: '100%' }}>
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
