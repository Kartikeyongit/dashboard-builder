import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MoreHorizontal, Pencil, Table2, Trash2 } from 'lucide-react';
import { datasourceAPI } from '../../api/datasource';
import { useAppDispatch, useAppSelector } from '../../hooks';
import {
  deleteDatasource,
  fetchDatasources,
  hideDatasource,
  restoreDatasource,
  testDatasourceConnection,
  updateDatasource,
} from '../../store/datasourceSlice';
import { addToast } from '../../store/toastSlice';
import { canEditContent } from '../../utils/permissions';
import { useDeferredDelete } from '../../hooks/useDeferredDelete';
import { matchesSearch } from '../../utils/library';
import { apiErrorMessage } from '../../utils/apiError';
import { pluralize, relativeTime } from '../../utils/format';
import type { Datasource } from '../../types';
import type { DatasourceUsage } from '../../types';
import EmptyState from '../ui/EmptyState';
import ListToolbar from '../ui/ListToolbar';
import Menu from '../../ui/Menu';
import RenameDialog from '../../ui/RenameDialog';
import DependencyDialog from '../../ui/DependencyDialog';
import type { DependencyGroup } from '../../ui/DependencyDialog';
import SchemaDialog from './SchemaDialog';
import '../ui/ListPage.css';
import './DatasourceList.css';

type DatasourceSort = 'updated' | 'created' | 'name';

const DATASOURCE_SORT_OPTIONS: { value: DatasourceSort; label: string }[] = [
  { value: 'updated', label: 'Recently updated' },
  { value: 'created', label: 'Recently created' },
  { value: 'name', label: 'Name A–Z' },
];

const usageGroups = (usage: DatasourceUsage): DependencyGroup[] => [
  {
    label: 'Saved queries',
    items: usage.queries.map((query) => ({ id: query.id, label: query.name })),
  },
  {
    label: 'Dashboards',
    items: usage.dashboards.map((dashboard) => ({
      id: dashboard.id,
      label: dashboard.name,
      meta: `${usage.widgets.filter((widget) => widget.dashboard_id === dashboard.id).length} widgets`,
    })),
  },
];

const DatasourceList: React.FC = () => {
  const dispatch = useAppDispatch();
  const { items, loading } = useAppSelector((state) => state.datasources);
  const user = useAppSelector((state) => state.auth.user);
  const canEdit = canEditContent(user);
  const scheduleDelete = useDeferredDelete();

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<DatasourceSort>('updated');
  const [renameTarget, setRenameTarget] = useState<Datasource | null>(null);
  const [schemaTarget, setSchemaTarget] = useState<Datasource | null>(null);
  const [dependency, setDependency] = useState<{
    datasource: Datasource;
    usage: DatasourceUsage;
  } | null>(null);

  useEffect(() => {
    dispatch(fetchDatasources());
  }, [dispatch]);

  const visible = useMemo(() => {
    const filtered = items.filter((datasource) =>
      matchesSearch(search, datasource.name, datasource.host, datasource.db_name, datasource.username),
    );
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

  const handleDelete = async (datasource: Datasource) => {
    // Check dependencies before scheduling the undoable delete. A datasource
    // that still backs saved queries would orphan widgets on live dashboards.
    try {
      const res = await datasourceAPI.usage(datasource.id);
      const usage = res.data;
      if (usage.queries.length > 0 || usage.widgets.length > 0) {
        setDependency({ datasource, usage });
        return;
      }
    } catch (err) {
      dispatch(addToast({ message: apiErrorMessage(err, 'Could not check datasource usage.'), type: 'error' }));
      return;
    }

    scheduleDelete({
      entity: 'Datasource',
      remove: () => dispatch(hideDatasource(datasource.id)),
      restore: () => dispatch(restoreDatasource(datasource)),
      commit: async () => {
        const result = await dispatch(deleteDatasource(datasource.id));
        return deleteDatasource.fulfilled.match(result)
          ? { ok: true }
          : { ok: false, error: apiErrorMessage(result.payload, 'Could not delete the datasource.') };
      },
    });
  };

  const handleRename = async (name: string) => {
    if (!renameTarget) return;
    const result = await dispatch(
      updateDatasource({
        id: renameTarget.id,
        data: {
          name,
          type: renameTarget.type,
          host: renameTarget.host,
          port: renameTarget.port,
          db_name: renameTarget.db_name,
          username: renameTarget.username,
          ssl_mode: renameTarget.ssl_mode,
        },
      }),
    );
    if (!updateDatasource.fulfilled.match(result)) {
      throw new Error('Could not rename this datasource. Try again.');
    }
    dispatch(addToast({ message: 'Datasource renamed', type: 'success' }));
  };

  const handleTest = async (id: string) => {
    const result = await dispatch(testDatasourceConnection(id));
    if (testDatasourceConnection.fulfilled.match(result)) {
      const latency = result.payload.latencyMs;
      dispatch(addToast({
        message: latency === undefined ? 'Connection successful' : `Connection successful · ${latency} ms`,
        type: 'success',
      }));
    } else {
      dispatch(addToast({ message: result.payload || 'Connection failed', type: 'error' }));
    }
  };

  const countLabel = (count: number) =>
    count === items.length
      ? pluralize(count, 'datasource')
      : `${count} of ${pluralize(items.length, 'datasource')}`;

  return (
    <div className="list-page">
      <div className="list-panel">
        <div className="page-header">
          <div>
            <p className="eyebrow">Datasources</p>
            <h2>Connected Databases</h2>
            <p className="lede">Manage your PostgreSQL and MySQL connections.</p>
          </div>
          {canEdit && <Link to="/datasources/new" className="add-btn">+ Add Datasource</Link>}
        </div>

        <ListToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by name, host, or database"
          sortValue={sort}
          sortOptions={DATASOURCE_SORT_OPTIONS}
          onSortChange={(value) => setSort(value as DatasourceSort)}
          count={visible.length}
          countLabel={countLabel}
        />

        <div className="list-grid-wrapper">
          {loading && (
            <ul className="list-grid">
              {[...Array(4)].map((_, i) => <li key={i} className="skeleton-card" />)}
            </ul>
          )}

          {!loading && (
            <ul className="list-grid">
              {visible.map((ds) => (
                <li key={ds.id} className="list-card">
                  <div className="card-header">
                    <div className="card-icon">
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 5a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V9zm0 5a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" />
                      </svg>
                    </div>
                    <div className="card-title">
                      {ds.name}
                      <span className="type-badge">{ds.type}</span>
                    </div>
                    {canEdit && (
                      <Menu
                        label={`${ds.name} actions`}
                        trigger={
                          <button type="button" className="card-menu-btn" aria-label={`${ds.name} actions`}>
                            <MoreHorizontal size={17} aria-hidden="true" />
                          </button>
                        }
                        items={[
                          { key: 'rename', label: 'Rename', icon: Pencil, onSelect: () => setRenameTarget(ds) },
                          {
                            key: 'schema',
                            label: 'Browse schema',
                            icon: Table2,
                            onSelect: () => setSchemaTarget(ds),
                          },
                          {
                            key: 'delete',
                            label: 'Delete',
                            icon: Trash2,
                            onSelect: () => handleDelete(ds),
                            danger: true,
                            separatorBefore: true,
                          },
                        ]}
                      />
                    )}
                  </div>
                  <div className="card-detail">
                    <span>{ds.host}:{ds.port}/{ds.db_name}</span>
                    <span>{ds.username}</span>
                  </div>
                  <div className="card-meta">
                    <span title={new Date(ds.updated_at).toLocaleString()}>Updated {relativeTime(ds.updated_at)}</span>
                  </div>
                  <div className="card-actions">
                    {canEdit && (
                      <>
                        <button className="edit-link" onClick={() => handleTest(ds.id)}>Test</button>
                        <button className="edit-link" onClick={() => setSchemaTarget(ds)}>Schema</button>
                        <Link to={`/datasources/${ds.id}/edit`} className="edit-link">Edit</Link>
                      </>
                    )}
                  </div>
                </li>
              ))}

              {items.length === 0 && (
                <li style={{ gridColumn: '1 / -1', listStyle: 'none' }}>
                  <EmptyState
                    icon="datasource"
                    title="No datasources yet"
                    description="Connect your first database to start building queries."
                    action={canEdit ? { label: 'Add Datasource', to: '/datasources/new' } : undefined}
                  />
                </li>
              )}

              {items.length > 0 && visible.length === 0 && (
                <li style={{ gridColumn: '1 / -1', listStyle: 'none' }}>
                  <EmptyState
                    icon="datasource"
                    title="No matching datasources"
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
        title="Rename datasource"
        initialValue={renameTarget?.name ?? ''}
        onSave={handleRename}
      />

      {schemaTarget && (
        <SchemaDialog
          open
          datasourceId={schemaTarget.id}
          datasourceName={schemaTarget.name}
          onClose={() => setSchemaTarget(null)}
        />
      )}

      <DependencyDialog
        open={Boolean(dependency)}
        title="Datasource is in use"
        description={
          dependency
            ? `${dependency.datasource.name} still backs ${pluralize(
                dependency.usage.queries.length,
                'saved query',
                'saved queries',
              )} and ${pluralize(dependency.usage.widgets.length, 'widget')}.`
            : ''
        }
        groups={dependency ? usageGroups(dependency.usage) : []}
        onClose={() => setDependency(null)}
      />
    </div>
  );
};

export default DatasourceList;
