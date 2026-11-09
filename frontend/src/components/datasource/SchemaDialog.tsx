import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Database, Search } from 'lucide-react';
import { datasourceAPI } from '../../api/datasource';
import type { TableSchema } from '../../types';
import { apiErrorMessage } from '../../utils/apiError';
import { pluralize } from '../../utils/format';
import Dialog from '../../ui/Dialog';
import Button from '../../ui/Button';
import { Input } from '../../ui/Field';
import './SchemaDialog.css';

interface Props {
  open: boolean;
  datasourceId: string;
  datasourceName: string;
  onClose: () => void;
}

/** Read-only schema browser. Search matches either a table or a column name. */
const SchemaDialog: React.FC<Props> = ({ open, datasourceId, datasourceName, onClose }) => {
  const [schema, setSchema] = useState<TableSchema[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetching the schema is the purpose of this effect
    setLoading(true);
    setError('');
    datasourceAPI
      .getSchema(datasourceId)
      .then((res) => {
        if (!cancelled) setSchema(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err) => {
        if (!cancelled) setError(apiErrorMessage(err, 'Could not read the schema.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, datasourceId]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return schema;
    return schema
      .map((table) => {
        const tableMatches = table.table_name.toLowerCase().includes(term);
        const columns = table.columns.filter((column) =>
          column.name.toLowerCase().includes(term),
        );
        if (!tableMatches && columns.length === 0) return null;
        return { ...table, columns: tableMatches ? table.columns : columns };
      })
      .filter((table): table is TableSchema => table !== null);
  }, [schema, search]);

  const copyName = async (name: string) => {
    try {
      await navigator.clipboard.writeText(name);
      setCopied(name);
      window.setTimeout(() => setCopied((current) => (current === name ? null : current)), 1500);
    } catch {
      // Clipboard access can be denied; the name stays selectable in the list.
    }
  };

  const columnCount = filtered.reduce((total, table) => total + table.columns.length, 0);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={`Schema · ${datasourceName}`}
      description="Browse tables and columns exposed by this connection."
      size="lg"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="schema-toolbar">
        <div className="schema-search">
          <Search size={14} aria-hidden="true" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search tables or columns"
            aria-label="Search schema"
          />
        </div>
        {!loading && !error && (
          <span className="schema-count">
            {filtered.length} of {pluralize(schema.length, 'table')} ·{' '}
            {pluralize(columnCount, 'column')}
          </span>
        )}
      </div>

      {loading && <p className="schema-status">Reading schema…</p>}
      {error && <p className="schema-status schema-status--error" role="alert">{error}</p>}
      {!loading && !error && schema.length === 0 && (
        <p className="schema-status">This connection has no tables in its default schema.</p>
      )}
      {!loading && !error && schema.length > 0 && filtered.length === 0 && (
        <p className="schema-status">No tables or columns match “{search}”.</p>
      )}

      <div className="schema-tables">
        {filtered.map((table) => (
          <section className="schema-table" key={table.table_name}>
            <div className="schema-table-header">
              <Database size={13} aria-hidden="true" />
              <span className="schema-table-name">{table.table_name}</span>
              <span className="schema-table-meta">{table.columns.length} columns</span>
              <button
                type="button"
                className="schema-copy"
                onClick={() => copyName(table.table_name)}
                aria-label={`Copy ${table.table_name}`}
                title="Copy table name"
              >
                {copied === table.table_name ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>
            <ul className="schema-columns">
              {table.columns.map((column) => (
                <li key={column.name}>
                  <span className="schema-column-name">{column.name}</span>
                  <span className="schema-column-type">{column.data_type}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Dialog>
  );
};

export default SchemaDialog;
