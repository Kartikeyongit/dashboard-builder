import React, { useEffect, useRef } from 'react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import type { QueryResult } from '../../types';

ModuleRegistry.registerModules([AllCommunityModule]);

const DARK_VARS: [string, string][] = [
  ['--ag-background-color', '#1e293b'],
  ['--ag-foreground-color', '#f1f5f9'],
  ['--ag-header-background-color', '#0f172a'],
  ['--ag-header-foreground-color', '#f1f5f9'],
  ['--ag-border-color', '#334155'],
  ['--ag-secondary-border-color', '#334155'],
  ['--ag-row-hover-color', 'rgba(255,255,255,0.05)'],
  ['--ag-odd-row-background-color', 'rgba(0,0,0,0.15)'],
  ['--ag-input-focus-border-color', 'rgba(59,130,246,0.4)'],
];

interface Props {
  data?: QueryResult;
}

const TableWidget: React.FC<Props> = ({ data }) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const columns = Array.isArray(data?.columns) ? data.columns : [];
  const rows = Array.isArray(data?.rows) ? data.rows : [];

  useEffect(() => {
    const el = gridRef.current;
    if (!el || columns.length === 0) return;

    const applyTheme = () => {
      const dark = document.documentElement.getAttribute('data-theme') === 'dark';
      for (const [key, val] of DARK_VARS) {
        el.style.setProperty(key, dark ? val : '');
      }
    };

    applyTheme();

    const observer = new MutationObserver(applyTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    return () => observer.disconnect();
  }, [columns.length, data]);

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
    <div ref={gridRef} className="ag-theme-alpine" style={{ height: '100%', minHeight: 180, width: '100%' }}>
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
