import React, { useEffect, useState } from 'react';
import { AllCommunityModule, ModuleRegistry, themeAlpine, colorSchemeDark } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import type { QueryResult } from '../../types';

ModuleRegistry.registerModules([AllCommunityModule]);

interface Props {
  data?: QueryResult;
}

const TableWidget: React.FC<Props> = ({ data }) => {
  const [, forceUpdate] = useState(0);
  const columns = Array.isArray(data?.columns) ? data.columns : [];
  const rows = Array.isArray(data?.rows) ? data.rows : [];

  useEffect(() => {
    const observer = new MutationObserver(() => forceUpdate(n => n + 1));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  if (columns.length === 0) {
    return (
      <div style={{ padding: 12, color: '#64748b' }}>
        No table columns returned by this query.
      </div>
    );
  }

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

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
    <div style={{ height: '100%', minHeight: 180, width: '100%' }}>
      <AgGridReact
        theme={isDark ? themeAlpine.withPart(colorSchemeDark) : themeAlpine}
        columnDefs={columnDefs}
        rowData={rowData}
        defaultColDef={{ resizable: true }}
        overlayNoRowsTemplate="<span>No rows returned by this query.</span>"
      />
    </div>
  );
};

export default TableWidget;
