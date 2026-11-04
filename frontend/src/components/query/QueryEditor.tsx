import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MonacoEditor from '@monaco-editor/react';
import type { OnMount } from '@monaco-editor/react';
import type * as MonacoTypes from 'monaco-editor';
import { useParams, useNavigate, useBlocker } from 'react-router-dom';
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowUpDown,
  Check,
  Copy,
  Download,
  FileCode2,
  Loader2,
  Play,
  Save,
  Search,
  Table2,
  Timer,
  Wand2,
  X,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { fetchDatasources } from '../../store/datasourceSlice';
import { fetchQueries, createQuery, updateQuery } from '../../store/querySlice';
import { datasourceAPI } from '../../api/datasource';
import { queryAPI } from '../../api/query';
import type { CreateQueryPayload, QueryResult, TableSchema } from '../../types';
import { addToast } from '../../store/toastSlice';
import { apiErrorMessage } from '../../utils/apiError';
import { downloadCSV, safeFilename, toCSV } from '../../utils/csv';
import { formatCell, prepareRows, toTSV } from '../../utils/resultGrid';
import type { ResultSort } from '../../utils/resultGrid';
import { parseSqlError } from '../../utils/sqlError';
import type { FriendlySqlError } from '../../utils/sqlError';
import Dropdown from '../ui/Dropdown';
import ConfirmDialog from '../../ui/ConfirmDialog';
import './QueryEditor.css';

interface Snapshot {
  dsId: string;
  name: string;
  sql: string;
  maxRows: number;
  timeoutSec: number;
}

const DEFAULT_MAX_ROWS = 1000;
const MAX_ROWS_LIMIT = 10000;
const DEFAULT_TIMEOUT_SEC = 30;
const MIN_TIMEOUT_SEC = 1;
const MAX_TIMEOUT_SEC = 60;
const EDITOR_MIN_HEIGHT = 180;
const EDITOR_MAX_HEIGHT = 720;
const RESULT_PAGE_SIZE = 200;
const EDITOR_HEIGHT_KEY = 'qe-editor-height';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** Monaco can report CRLF on Windows; compare and store SQL with LF only. */
const normalizeSql = (text: string) => text.replace(/\r\n?/g, '\n');

const parseNumber = (value: string, fallback: number) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const durationLabel = (milliseconds?: number) => {
  if (milliseconds === undefined || milliseconds === null) return null;
  if (milliseconds < 1000) return `${milliseconds} ms`;
  return `${(milliseconds / 1000).toFixed(2)} s`;
};

const initialEditorHeight = () => {
  try {
    const stored = Number(window.localStorage.getItem(EDITOR_HEIGHT_KEY));
    if (Number.isFinite(stored) && stored >= EDITOR_MIN_HEIGHT) {
      return clamp(stored, EDITOR_MIN_HEIGHT, EDITOR_MAX_HEIGHT);
    }
  } catch {
    // Private mode can block localStorage; fall back to the default height.
  }
  return 340;
};

const QueryEditor: React.FC = () => {
  const { queryId } = useParams<{ queryId?: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const datasources = useAppSelector((state) => state.datasources.items);
  const queries = useAppSelector((state) => state.queries.items);

  const [selectedDsId, setSelectedDsId] = useState<string>('');
  const [sqlText, setSqlText] = useState<string>('');
  const [queryName, setQueryName] = useState<string>('');
  const [maxRowsText, setMaxRowsText] = useState(String(DEFAULT_MAX_ROWS));
  const [timeoutText, setTimeoutText] = useState(String(DEFAULT_TIMEOUT_SEC));

  const [result, setResult] = useState<QueryResult | null>(null);
  const [sqlError, setSqlError] = useState<FriendlySqlError | null>(null);
  const [validationError, setValidationError] = useState('');
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [schema, setSchema] = useState<TableSchema[]>([]);
  const [baseline, setBaseline] = useState<Snapshot>({
    dsId: '',
    name: '',
    sql: '',
    maxRows: DEFAULT_MAX_ROWS,
    timeoutSec: DEFAULT_TIMEOUT_SEC,
  });

  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState<ResultSort | null>(null);
  const [pageSize, setPageSize] = useState(RESULT_PAGE_SIZE);
  const [copied, setCopied] = useState(false);

  const [editorHeight, setEditorHeight] = useState(initialEditorHeight);
  const [monacoTheme, setMonacoTheme] = useState<string>(
    document.documentElement.getAttribute('data-theme') === 'dark' ? 'vs-dark' : 'vs',
  );

  const editorRef = useRef<MonacoTypes.editor.IStandaloneCodeEditor | null>(null);
  const completionRef = useRef<MonacoTypes.IDisposable | null>(null);
  const schemaRef = useRef<TableSchema[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const runningRef = useRef(false);
  const loadedQueryRef = useRef<string | null>(null);
  const allowLeaveRef = useRef(false);
  const runRef = useRef<() => void>(() => {});
  const formatRef = useRef<() => void>(() => {});
  const copyTimerRef = useRef<number | null>(null);

  const maxRows = clamp(parseNumber(maxRowsText, DEFAULT_MAX_ROWS), 1, MAX_ROWS_LIMIT);
  const timeoutSec = clamp(parseNumber(timeoutText, DEFAULT_TIMEOUT_SEC), MIN_TIMEOUT_SEC, MAX_TIMEOUT_SEC);

  const dirtyFields = [
    selectedDsId !== baseline.dsId ? 'datasource' : '',
    queryName.trim() !== baseline.name ? 'name' : '',
    normalizeSql(sqlText) !== normalizeSql(baseline.sql) ? 'sql' : '',
    maxRows !== baseline.maxRows ? 'maxRows' : '',
    timeoutSec !== baseline.timeoutSec ? 'timeout' : '',
  ].filter(Boolean);
  const dirty = dirtyFields.length > 0;

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty &&
      !allowLeaveRef.current &&
      currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    const el = document.documentElement;
    const observer = new MutationObserver(() => {
      setMonacoTheme(el.getAttribute('data-theme') === 'dark' ? 'vs-dark' : 'vs');
    });
    observer.observe(el, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    dispatch(fetchDatasources());
    dispatch(fetchQueries());
  }, [dispatch]);

  useEffect(() => {
    schemaRef.current = schema;
  }, [schema]);

  useEffect(() => {
    if (!queryId) return;
    const existing = queries.find((query) => query.id === queryId);
    if (!existing || loadedQueryRef.current === existing.id) return;
    loadedQueryRef.current = existing.id;
    const nextMaxRows = clamp(existing.max_rows || DEFAULT_MAX_ROWS, 1, MAX_ROWS_LIMIT);
    const nextTimeoutSec = clamp(
      Math.max(1, Math.round((existing.timeout_ms || DEFAULT_TIMEOUT_SEC * 1000) / 1000)),
      MIN_TIMEOUT_SEC,
      MAX_TIMEOUT_SEC,
    );
    const nextSql = normalizeSql(existing.sql_text);
    setSelectedDsId(existing.datasource_id);
    setSqlText(nextSql);
    setQueryName(existing.name);
    setMaxRowsText(String(nextMaxRows));
    setTimeoutText(String(nextTimeoutSec));
    setBaseline({
      dsId: existing.datasource_id,
      name: existing.name.trim(),
      sql: nextSql,
      maxRows: nextMaxRows,
      timeoutSec: nextTimeoutSec,
    });
  }, [queryId, queries]);

  useEffect(() => {
    if (!selectedDsId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear stale schema when no datasource is selected
      setSchema([]);
      return;
    }
    let cancelled = false;
    datasourceAPI
      .getSchema(selectedDsId)
      .then((res) => {
        if (!cancelled) setSchema(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {
        if (!cancelled) setSchema([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedDsId]);

  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  useEffect(
    () => () => {
      requestIdRef.current += 1;
      completionRef.current?.dispose();
      abortRef.current?.abort();
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    },
    [],
  );

  const selectedDatasource = datasources.find((datasource) => datasource.id === selectedDsId);

  const execute = useCallback(
    async (sql: string) => {
      const text = normalizeSql(sql).trim();
      if (!selectedDsId || !text || runningRef.current) return;
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      const controller = new AbortController();
      abortRef.current = controller;
      runningRef.current = true;
      setRunning(true);
      setSqlError(null);
      setValidationError('');
      try {
        const res = await queryAPI.executeAdHoc(
          {
            datasource_id: selectedDsId,
            sql_text: text,
            max_rows: maxRows,
            timeout_ms: timeoutSec * 1000,
          },
          controller.signal,
        );
        if (requestId !== requestIdRef.current) return;
        setResult(res.data);
        setFilter('');
        setSort(null);
        setPageSize(RESULT_PAGE_SIZE);
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        setSqlError(parseSqlError(apiErrorMessage(err, 'The query failed.'), text));
      } finally {
        if (requestId === requestIdRef.current) {
          setRunning(false);
          runningRef.current = false;
          abortRef.current = null;
        }
      }
    },
    [selectedDsId, maxRows, timeoutSec],
  );

  const handleRun = useCallback(() => {
    if (runningRef.current) return;
    const editor = editorRef.current;
    const model = editor?.getModel();
    const selection = editor?.getSelection();
    const selectedText =
      selection && !selection.isEmpty() && model ? model.getValueInRange(selection) : '';
    // Read the model instead of state so an edit that React has not committed
    // yet is never dropped from a run.
    const currentText = model?.getValue() ?? sqlText;
    void execute(selectedText || currentText);
  }, [execute, sqlText]);

  useEffect(() => {
    runRef.current = handleRun;
  }, [handleRun]);

  const handleCancel = () => {
    if (!runningRef.current) return;
    requestIdRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    runningRef.current = false;
    setRunning(false);
    dispatch(addToast({ message: 'Query canceled', type: 'info' }));
  };

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      runRef.current();
    });
    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF, () => {
      void formatRef.current();
    });

    completionRef.current = monaco.languages.registerCompletionItemProvider('sql', {
      provideCompletionItems: (
        model: MonacoTypes.editor.ITextModel,
        position: MonacoTypes.Position,
      ) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };
        const suggestions: MonacoTypes.languages.CompletionItem[] = [];
        const keywords = [
          'SELECT',
          'FROM',
          'WHERE',
          'GROUP BY',
          'ORDER BY',
          'HAVING',
          'LIMIT',
          'JOIN',
          'LEFT JOIN',
          'INNER JOIN',
          'WITH',
          'UNION ALL',
        ];
        keywords.forEach((keyword) => {
          suggestions.push({
            label: keyword,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: keyword,
            range,
          });
        });
        schemaRef.current.forEach((table) => {
          suggestions.push({
            label: table.table_name,
            kind: monaco.languages.CompletionItemKind.Module,
            detail: 'table',
            insertText: table.table_name,
            range,
          });
          table.columns.forEach((column) => {
            suggestions.push({
              label: column.name,
              kind: monaco.languages.CompletionItemKind.Field,
              detail: column.data_type,
              insertText: column.name,
              range,
            });
          });
        });
        return { suggestions };
      },
    });
  };

  // Monaco owns the text until React commits `onChange`; read the model
  // directly for actions that must never use a stale snapshot.
  const liveSql = () => normalizeSql(editorRef.current?.getModel()?.getValue() ?? sqlText);

  const handleFormat = async () => {
    const text = liveSql();
    if (!text.trim()) return;
    try {
      // Loaded on demand so the editor route stays small until formatting is
      // actually used.
      const { format } = await import('sql-formatter');
      const next = format(text, {
        language: selectedDatasource?.type === 'mysql' ? 'mysql' : 'postgresql',
        keywordCase: 'upper',
        tabWidth: 2,
      });
      setSqlText(next);
      setValidationError('');
    } catch {
      dispatch(addToast({ message: 'Could not format this SQL.', type: 'error' }));
    }
  };

  useEffect(() => {
    formatRef.current = handleFormat;
  });

  const currentSnapshot = (): Snapshot => ({
    dsId: selectedDsId,
    name: queryName.trim(),
    sql: liveSql(),
    maxRows,
    timeoutSec,
  });
  const handleSave = async (mode: 'list' | 'stay') => {
    const text = liveSql();
    if (!selectedDsId || !text.trim() || !queryName.trim()) {
      setValidationError('Add a query name, choose a datasource, and write some SQL before saving.');
      return;
    }
    if (saving) return;

    const payload: CreateQueryPayload = {
      datasource_id: selectedDsId,
      name: queryName.trim(),
      sql_text: text,
      max_rows: maxRows,
      timeout_ms: timeoutSec * 1000,
    };

    setSaving(true);
    setValidationError('');
    try {
      if (queryId) {
        await dispatch(updateQuery({ id: queryId, data: payload })).unwrap();
        dispatch(addToast({ message: 'Query saved', type: 'success' }));
      } else {
        const created = await dispatch(createQuery(payload)).unwrap();
        loadedQueryRef.current = created.id;
        dispatch(addToast({ message: 'Query created', type: 'success' }));
        // Move to the edit URL so a second save updates instead of duplicating.
        allowLeaveRef.current = true;
        navigate(`/queries/${created.id}/edit`, { replace: true });
        window.setTimeout(() => {
          allowLeaveRef.current = false;
        }, 0);
      }
      setBaseline(currentSnapshot());

      if (mode === 'list') {
        allowLeaveRef.current = true;
        navigate('/queries');
      } else {
        await execute(text);
      }
    } catch (err) {
      const message = apiErrorMessage(err, 'Could not save the query.');
      setValidationError(message);
      dispatch(addToast({ message, type: 'error' }));
    } finally {
      setSaving(false);
    }
  };

  const jumpToLine = (line: number) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.revealLineInCenter(line);
    editor.setPosition({ lineNumber: line, column: 1 });
    editor.focus();
  };

  const preparedRows = useMemo(
    () => prepareRows(result?.rows ?? [], { term: filter, sort }),
    [result, filter, sort],
  );
  const visibleRows = preparedRows.slice(0, pageSize);

  const toggleSort = (column: number) => {
    setPageSize(RESULT_PAGE_SIZE);
    setSort((current) => {
      if (!current || current.column !== column) return { column, direction: 'asc' };
      return { column, direction: current.direction === 'asc' ? 'desc' : 'asc' };
    });
  };

  const sortIcon = (column: number) => {
    if (sort?.column !== column) return <ArrowUpDown size={12} aria-hidden="true" />;
    return sort.direction === 'asc' ? (
      <ArrowUp size={12} aria-hidden="true" />
    ) : (
      <ArrowDown size={12} aria-hidden="true" />
    );
  };

  const ariaSort = (column: number): 'ascending' | 'descending' | 'none' => {
    if (sort?.column !== column) return 'none';
    return sort.direction === 'asc' ? 'ascending' : 'descending';
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(toTSV(result.columns, preparedRows));
      setCopied(true);
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => setCopied(false), 1600);
      dispatch(addToast({ message: 'Results copied as TSV', type: 'success' }));
    } catch {
      dispatch(addToast({ message: 'Clipboard access was denied.', type: 'error' }));
    }
  };

  const handleExport = () => {
    if (!result) return;
    const filename = safeFilename(queryName.trim() || 'query-results', 'query-results');
    downloadCSV(
      filename,
      toCSV({ columns: result.columns, rows: preparedRows, duration_ms: result.duration_ms }),
    );
    dispatch(addToast({ message: 'CSV downloaded', type: 'success' }));
  };

  const handleDividerPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = editorHeight;
    const handleMove = (moveEvent: PointerEvent) => {
      setEditorHeight(clamp(startHeight + moveEvent.clientY - startY, EDITOR_MIN_HEIGHT, EDITOR_MAX_HEIGHT));
    };
    const handleUp = () => {
      document.removeEventListener('pointermove', handleMove);
      document.body.classList.remove('qe-resizing');
      setEditorHeight((height) => {
        try {
          window.localStorage.setItem(EDITOR_HEIGHT_KEY, String(height));
        } catch {
          // Persisting the split height is a nicety, not a requirement.
        }
        return height;
      });
    };
    document.body.classList.add('qe-resizing');
    document.addEventListener('pointermove', handleMove);
    document.addEventListener('pointerup', handleUp, { once: true });
  };

  const handleDividerKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown' && event.key !== 'Home' && event.key !== 'End') {
      return;
    }
    event.preventDefault();
    if (event.key === 'Home') {
      setEditorHeight(EDITOR_MIN_HEIGHT);
      return;
    }
    if (event.key === 'End') {
      setEditorHeight(EDITOR_MAX_HEIGHT);
      return;
    }
    const delta = event.key === 'ArrowUp' ? -24 : 24;
    setEditorHeight((height) => clamp(height + delta, EDITOR_MIN_HEIGHT, EDITOR_MAX_HEIGHT));
  };

  const hasFilterPlaceholders = /\{\{\s*[A-Za-z_][A-Za-z0-9_]*\s*\}\}/.test(sqlText);
  const truncated = Boolean(result && result.rows.length >= maxRows);
  const duration = durationLabel(result?.duration_ms);
  const rowLabel = result
    ? `${preparedRows.length.toLocaleString()} of ${result.rows.length.toLocaleString()} rows`
    : '';

  return (
    <div className="query-editor-page">
      <button type="button" className="back-btn" onClick={() => navigate('/queries')}>
        <ArrowLeft size={14} aria-hidden="true" />
        Back to Queries
      </button>

      <div className="query-toolbar">
        <div className="query-toolbar-row">
          <Dropdown
            className="query-ds-select"
            value={selectedDsId}
            onChange={(value) => {
              setSelectedDsId(value);
              setValidationError('');
            }}
            options={[
              { value: '', label: 'Select a datasource' },
              ...datasources.map((ds) => ({ value: ds.id, label: `${ds.name} (${ds.type})` })),
            ]}
            placeholder="Select Datasource"
          />
          <div className="input-wrapper">
            <FileCode2 className="input-icon" size={16} aria-hidden="true" />
            <input
              placeholder="Query name"
              value={queryName}
              onChange={(event) => {
                setQueryName(event.target.value);
                setValidationError('');
              }}
              aria-label="Query name"
            />
          </div>
          <div className="query-toolbar-actions">
            {running && (
              <button type="button" className="query-btn query-btn--secondary" onClick={handleCancel}>
                <X size={14} aria-hidden="true" />
                Cancel
              </button>
            )}
            <button
              type="button"
              className="query-btn query-btn--primary"
              onClick={handleRun}
              disabled={running || !selectedDsId || !sqlText.trim()}
              title="Run selection or whole query (Ctrl/Cmd+Enter)"
            >
              {running ? (
                <>
                  <Loader2 className="qe-spin" size={14} aria-hidden="true" />
                  Running…
                </>
              ) : (
                <>
                  <Play size={14} aria-hidden="true" />
                  Run
                </>
              )}
            </button>
            <button
              type="button"
              className="query-btn query-btn--secondary"
              onClick={() => handleSave('stay')}
              disabled={saving || running}
              title="Save the query and run it now"
            >
              {saving ? <Loader2 className="qe-spin" size={14} aria-hidden="true" /> : <Play size={13} aria-hidden="true" />}
              Save &amp; run
            </button>
            <button
              type="button"
              className="query-btn query-btn--secondary"
              onClick={() => handleSave('list')}
              disabled={saving || running}
            >
              {saving ? <Loader2 className="qe-spin" size={14} aria-hidden="true" /> : <Save size={14} aria-hidden="true" />}
              Save
            </button>
          </div>
        </div>

        <div className="query-toolbar-row query-toolbar-row--options">
          <label className="query-option">
            <span>Max rows</span>
            <input
              type="number"
              min={1}
              max={MAX_ROWS_LIMIT}
              step={100}
              value={maxRowsText}
              onChange={(event) => setMaxRowsText(event.target.value)}
              onBlur={() => setMaxRowsText(String(maxRows))}
              aria-label="Maximum rows"
            />
          </label>
          <label className="query-option">
            <span>Timeout</span>
            <input
              type="number"
              min={MIN_TIMEOUT_SEC}
              max={MAX_TIMEOUT_SEC}
              step={1}
              value={timeoutText}
              onChange={(event) => setTimeoutText(event.target.value)}
              onBlur={() => setTimeoutText(String(timeoutSec))}
              aria-label="Timeout in seconds"
            />
            <span className="query-option-unit">s</span>
          </label>
          <button
            type="button"
            className="query-btn query-btn--ghost"
            onClick={() => void handleFormat()}
            disabled={!sqlText.trim()}
            title="Format SQL (Shift+Alt+F)"
          >
            <Wand2 size={13} aria-hidden="true" />
            Format
          </button>
          <span className="query-shortcut">Ctrl/⌘ + Enter runs the selection · Shift + Alt + F formats</span>
          {dirty && (
            <span className="query-dirty-badge">
              Unsaved changes
            </span>
          )}
        </div>
      </div>

      {hasFilterPlaceholders && (
        <div className="query-hint">
          This query uses dashboard filter placeholders like <code>{'{{filter_id}}'}</code>. Ad-hoc
          Run does not substitute them; open the dashboard in <strong>View</strong> mode to run it
          with filter values.
        </div>
      )}

      {validationError && (
        <div className="query-error" role="alert">
          <div className="query-error-head">
            <AlertCircle size={15} aria-hidden="true" />
            <span>Could not save</span>
          </div>
          <p className="query-error-message">{validationError}</p>
        </div>
      )}

      <div className="qe-editor-shell" style={{ height: editorHeight }}>
        <MonacoEditor
          height="100%"
          language="sql"
          theme={monacoTheme}
          value={sqlText}
          onChange={(value) => {
            setSqlText(normalizeSql(value || ''));
            setValidationError('');
          }}
          onMount={handleEditorMount}
          options={{
            minimap: { enabled: false },
            fontSize: 13.5,
            lineHeight: 21,
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            padding: { top: 10, bottom: 10 },
            renderLineHighlight: 'all',
            tabSize: 2,
          }}
        />
      </div>

      <div
        className="qe-split"
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize the SQL editor"
        aria-valuemin={EDITOR_MIN_HEIGHT}
        aria-valuemax={EDITOR_MAX_HEIGHT}
        aria-valuenow={editorHeight}
        tabIndex={0}
        onPointerDown={handleDividerPointerDown}
        onKeyDown={handleDividerKeyDown}
        onDoubleClick={() => setEditorHeight(340)}
      />

      <section className="results-panel" aria-label="Query results" aria-busy={running}>
        <div className="results-panel-header">
          <div className="results-heading">
            <h3>Results</h3>
            {result && (
              <span className="results-meta">
                {rowLabel} · {result.columns.length} columns
                {duration ? ` · ${duration}` : ''}
              </span>
            )}
          </div>
          <div className="results-actions">
            <div className="results-filter">
              <Search size={13} aria-hidden="true" />
              <input
                value={filter}
                onChange={(event) => {
                  setFilter(event.target.value);
                  setPageSize(RESULT_PAGE_SIZE);
                }}
                placeholder="Filter rows"
                aria-label="Filter result rows"
                disabled={!result}
              />
            </div>
            <button
              type="button"
              className="query-btn query-btn--secondary query-btn--compact"
              onClick={handleCopy}
              disabled={!result}
            >
              {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              type="button"
              className="query-btn query-btn--secondary query-btn--compact"
              onClick={handleExport}
              disabled={!result}
            >
              <Download size={13} aria-hidden="true" />
              CSV
            </button>
          </div>
        </div>

        {sqlError && (
          <div className="query-error" role="alert">
            <div className="query-error-head">
              <AlertCircle size={15} aria-hidden="true" />
              <span>Query failed</span>
            </div>
            <p className="query-error-message">{sqlError.message}</p>
            {sqlError.hint && <p className="query-error-hint">{sqlError.hint}</p>}
            {sqlError.line && (
              <button type="button" className="query-error-action" onClick={() => jumpToLine(sqlError.line!)}>
                Go to line {sqlError.line}
              </button>
            )}
          </div>
        )}

        {!result && running && (
          <div className="results-skeleton" role="status">
            <div aria-hidden="true" className="results-skeleton-bars">
              {[92, 78, 86, 64, 90, 72].map((width, index) => (
                <span key={index} style={{ width: `${width}%` }} />
              ))}
            </div>
            <p>Running query…</p>
          </div>
        )}

        {!result && !running && (
          <div className="qe-results-empty">
            <Table2 size={22} aria-hidden="true" />
            <p>Run the query to preview rows here.</p>
            <span>Select part of the SQL to run only that statement.</span>
          </div>
        )}

        {result && (
          <>
            {truncated && (
              <p className="results-note">
                <Timer size={12} aria-hidden="true" />
                Stopped at the row limit of {maxRows.toLocaleString()}. Increase Max rows to fetch
                more.
              </p>
            )}
            <div className="results-table-scroll">
              <table className="result-table">
                <thead>
                  <tr>
                    {result.columns.map((column, index) => (
                      <th key={`${column}-${index}`} aria-sort={ariaSort(index)}>
                        <button
                          type="button"
                          className="result-sort"
                          onClick={() => toggleSort(index)}
                          title={`Sort by ${column}`}
                        >
                          {column}
                          {sortIcon(index)}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {result.columns.map((_, columnIndex) => {
                        const cell = row[columnIndex];
                        const text = formatCell(cell);
                        return (
                          <td
                            key={columnIndex}
                            title={text.length > 60 ? text : undefined}
                            className={typeof cell === 'number' ? 'result-cell--number' : undefined}
                          >
                            {cell === null || cell === undefined ? (
                              <span className="null-value">NULL</span>
                            ) : (
                              text
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {preparedRows.length === 0 && (
                    <tr>
                      <td className="results-no-match" colSpan={result.columns.length}>
                        {filter ? `No rows match “${filter}”.` : 'The query returned no rows.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {preparedRows.length > pageSize && (
              <div className="results-more">
                <button
                  type="button"
                  className="query-btn query-btn--secondary query-btn--compact"
                  onClick={() => setPageSize((size) => size + RESULT_PAGE_SIZE)}
                >
                  Show {Math.min(RESULT_PAGE_SIZE, preparedRows.length - pageSize)} more
                </button>
                <span>
                  Showing {visibleRows.length.toLocaleString()} of{' '}
                  {preparedRows.length.toLocaleString()} rows.
                </span>
              </div>
            )}
          </>
        )}
      </section>

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title="Discard unsaved query changes?"
        description="This query has unsaved changes. Leaving the page will discard them."
        confirmLabel="Discard and leave"
        cancelLabel="Keep editing"
        destructive
        onConfirm={() => {
          if (blocker.state === 'blocked') {
            allowLeaveRef.current = true;
            blocker.proceed();
          }
        }}
        onCancel={() => {
          if (blocker.state === 'blocked') blocker.reset();
        }}
      />
    </div>
  );
};

export default QueryEditor;
