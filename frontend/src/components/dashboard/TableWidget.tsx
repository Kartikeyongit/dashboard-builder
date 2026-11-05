import React, { useEffect, useState } from 'react';
import {
  ClientSideRowModelModule,
  DateFilterModule,
  ModuleRegistry,
  NumberFilterModule,
  TextFilterModule,
  ValidationModule,
  colorSchemeDark,
  themeAlpine,
} from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef } from 'ag-grid-community';
import type { QueryResult, WidgetConfig } from '../../types';
import { formatNumber } from '../../utils/widgetConfig';

// Register only the features this table uses. Pulling in AllCommunityModule
// would bundle editors, CSV export, infinite scrolling, and other modules the
// dashboard never reaches.
ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  TextFilterModule,
  NumberFilterModule,
  DateFilterModule,
  ValidationModule,
]);

interface Props {
  data?: QueryResult;
  config?: WidgetConfig | null;
}

const TableWidget: React.FC<Props> = ({ data, config }) => {
  const [, forceUpdate] = useState(0);
  const allColumns = Array.isArray(data?.columns) ? data.columns : [];
  const rows = Array.isArray(data?.rows) ? data.rows : [];

  useEffect(() => {
    const observer = new MutationObserver(() => forceUpdate(n => n + 1));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  const configured = Array.isArray(config?.visibleColumns) ? config.visibleColumns : [];
  const wanted = new Map(configured.map((column) => [column.toLowerCase(), true]));
  const selected = allColumns.filter((column) => wanted.has(column.toLowerCase()));
  // "All columns" is the default. If the saved config no longer matches the
  // query, fall back to the full result instead of an empty table.
  const visibleColumns = configured.length > 0 && selected.length > 0 ? selected : allColumns;

  if (allColumns.length === 0) {
    return (
      <div style={{ padding: 12, color: '#64748b' }}>
        No table columns returned by this query.
      </div>
    );
  }

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const compact = config?.density === 'compact';
  const numberFormat = config?.numberFormat ?? 'auto';

  const columnDefs: ColDef[] = visibleColumns.map((col, index) => ({
    field: col,
    sortable: true,
    filter: true,
    resizable: true,
    flex: 1,
    minWidth: 120,
    pinned: config?.pinFirstColumn && index === 0 ? 'left' : undefined,
    valueFormatter:
      numberFormat === 'auto'
        ? undefined
        : (params) => formatNumber(params.value, numberFormat, config?.decimals),
  }));

  const rowData = rows.map((row) => {
    const obj: Record<string, unknown> = {};
    allColumns.forEach((col, i) => {
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
        rowHeight={compact ? 28 : 36}
        headerHeight={compact ? 30 : 40}
        defaultColDef={{ resizable: true }}
        overlayNoRowsTemplate="<span>No rows returned by this query.</span>"
      />
    </div>
  );
};

export default TableWidget;
