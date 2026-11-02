import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks';
import {
  deleteQuery,
  fetchQueries,
  hideQuery,
  restoreQuery,
  updateQuery,
} from '../../store/querySlice';
import { queryAPI } from '../../api/query';
import { addToast } from '../../store/toastSlice';
import { canEditContent } from '../../utils/permissions';
import { apiErrorMessage } from '../../utils/apiError';
import { useDeferredDelete } from '../../hooks/useDeferredDelete';
import { matchesSearch } from '../../utils/library';
import { pluralize, relativeTime } from '../../utils/format';
import type { Query } from '../../types';
import EmptyState from '../ui/EmptyState';
import ListToolbar from '../ui/ListToolbar';
import Menu from '../../ui/Menu';
import RenameDialog from '../../ui/RenameDialog';
import '../ui/ListPage.css';
import './QueryList.css';

type QuerySort = 'updated' | 'created' | 'name';

const QUERY_SORT_OPTIONS: { value: QuerySort; label: string }[] = [
  { value: 'updated', label: 'Recently updated' },
  { value: 'created', label: 'Recently created' },
  { value: 'name', label: 'Name A–Z' },
];

const QueryList: React.FC = () => {
  const dispatch = useAppDispatch();
  const { items, loading } = useAppSelector((state) => state.queries);
  const user = useAppSelector((state) => state.auth.user);
  const canEdit = canEditContent(user);
  const scheduleDelete = useDeferredDelete();

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<QuerySort>('updated');
  const [renameTarget, setRenameTarget] = useState<Query | null>(null);

  useEffect(() => {
    dispatch(fetchQueries());
  }, [dispatch]);

  const visible = useMemo(() => {
    const filtered = items.filter((query) => matchesSearch(search, query.name, query.sql_text));
    const sorted = [...filtered];
    if (sort === 'name') {
      sorted.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    } else if (sort === 'created') {
      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else {
      sorted.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    }
    return sorted;
  }, [items, search, sort]);

  const handleDelete = (query: Query) => {
    scheduleDelete({
      entity: 'Query',
      remove: () => dispatch(hideQuery(query.id)),
      restore: () => dispatch(restoreQuery(query)),
      commit: async () => {
        const result = await dispatch(deleteQuery(query.id));
        return deleteQuery.fulfilled.match(result)
          ? { ok: true }
          : { ok: false, error: 'Could not delete the query.' };
      },
    });
  };

  const handleRename = async (name: string) => {
    if (!renameTarget) return;
    const result = await dispatch(
      updateQuery({
        id: renameTarget.id,
        data: {
          datasource_id: renameTarget.datasource_id,
          name,
          sql_text: renameTarget.sql_text,
          max_rows: renameTarget.max_rows,
          timeout_ms: renameTarget.timeout_ms,
        },
      }),
    );
    if (!updateQuery.fulfilled.match(result)) {
      throw new Error('Could not rename this query. Try again.');
    }
    dispatch(addToast({ message: 'Query renamed', type: 'success' }));
  };

  const handleRun = async (id: string) => {
    try {
      await queryAPI.executeSaved(id);
      dispatch(addToast({ message: 'Query executed successfully', type: 'success' }));
    } catch (err) {
      dispatch(addToast({ message: apiErrorMessage(err, 'Execution failed'), type: 'error' }));
    }
  };

  const countLabel = (count: number) =>
    count === items.length ? pluralize(count, 'query', 'queries') : `${count} of ${pluralize(items.length, 'query', 'queries')}`;

  return (
    <div className="list-page">
      <div className="list-panel">
        <div className="page-header">
          <div>
            <p className="eyebrow">Queries</p>
            <h2>Saved SQL</h2>
            <p className="lede">Reusable queries you've built from connected datasources.</p>
          </div>
          {canEdit && <Link to="/queries/new" className="add-btn">+ New Query</Link>}
        </div>

        <ListToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search queries by name or SQL"
          sortValue={sort}
          sortOptions={QUERY_SORT_OPTIONS}
          onSortChange={(value) => setSort(value as QuerySort)}
          count={visible.length}
          countLabel={countLabel}
        />

        <div className="list-grid-wrapper">
          {loading && (
            <ul className="list-grid">
              {[...Array(6)].map((_, i) => (
                <li key={i} className="skeleton-card" />
              ))}
            </ul>
          )}

          {!loading && (
            <ul className="list-grid">
              {visible.map((q) => (
                <li key={q.id} className="list-card">
                  <div className="card-header">
                    <div className="card-icon">
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="card-title">{q.name}</span>
                    {canEdit && (
                      <Menu
                        label={`${q.name} actions`}
                        trigger={
                          <button type="button" className="card-menu-btn" aria-label={`${q.name} actions`}>
                            <MoreHorizontal size={17} aria-hidden="true" />
                          </button>
                        }
                        items={[
                          { key: 'rename', label: 'Rename', icon: Pencil, onSelect: () => setRenameTarget(q) },
                          {
                            key: 'delete',
                            label: 'Delete',
                            icon: Trash2,
                            onSelect: () => handleDelete(q),
                            danger: true,
                            separatorBefore: true,
                          },
                        ]}
                      />
                    )}
                  </div>
                  <div className="sql-preview">
                    {q.sql_text.substring(0, 80)}
                    {q.sql_text.length > 80 ? '…' : ''}
                  </div>
                  <div className="card-meta">
                    <span title={new Date(q.updated_at).toLocaleString()}>Updated {relativeTime(q.updated_at)}</span>
                    <span>Max {pluralize(q.max_rows, 'row')}</span>
                  </div>
                  <div className="card-actions">
                    {canEdit && <Link to={`/queries/${q.id}/edit`} className="edit-link">Edit</Link>}
                    <button className="edit-link" onClick={() => handleRun(q.id)}>Run</button>
                  </div>
                </li>
              ))}

              {items.length === 0 && (
                <li style={{ gridColumn: '1 / -1', listStyle: 'none' }}>
                  <EmptyState
                    icon="query"
                    title="No queries saved yet"
                    description="Write your first SQL query to start exploring your data."
                    action={canEdit ? { label: 'New Query', to: '/queries/new' } : undefined}
                  />
                </li>
              )}

              {items.length > 0 && visible.length === 0 && (
                <li style={{ gridColumn: '1 / -1', listStyle: 'none' }}>
                  <EmptyState
                    icon="query"
                    title="No matching queries"
                    description="Try a different search term."
                    action={{ label: 'Clear search', onClick: () => setSearch('') }}
                  />
                </li>
              )}
            </ul>
          )}
        </div>
      </div>

      <RenameDialog
        open={Boolean(renameTarget)}
        onOpenChange={(next) => {
          if (!next) setRenameTarget(null);
        }}
        title="Rename query"
        initialValue={renameTarget?.name ?? ''}
        onSave={handleRename}
      />
    </div>
  );
};

export default QueryList;
