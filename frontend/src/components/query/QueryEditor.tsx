import React, { useState, useEffect, useRef } from 'react';
import MonacoEditor from '@monaco-editor/react';
import type { OnMount } from '@monaco-editor/react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { fetchDatasources } from '../../store/datasourceSlice';
import { fetchQueries, createQuery, updateQuery } from '../../store/querySlice';
import { datasourceAPIWithSchema, queryAPI } from '../../api/query';
import type { CreateQueryPayload, QueryResult, TableSchema } from '../../types';
import { addToast } from '../../store/toastSlice';
import './QueryEditor.css';

const QueryEditor: React.FC = () => {
  const { queryId } = useParams<{ queryId?: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const datasources = useAppSelector((state) => state.datasources.items);
  const queries = useAppSelector((state) => state.queries.items);

  const [selectedDsId, setSelectedDsId] = useState<string>('');
  const [sqlText, setSqlText] = useState<string>('');
  const [queryName, setQueryName] = useState<string>('');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [schema, setSchema] = useState<TableSchema[]>([]);
  const editorRef = useRef<any>(null);

  useEffect(() => {
    dispatch(fetchDatasources());
    dispatch(fetchQueries());
  }, [dispatch]);

  useEffect(() => {
    if (queryId) {
      const existing = queries.find(q => q.id === queryId);
      if (existing) {
        setSelectedDsId(existing.datasource_id);
        setSqlText(existing.sql_text);
        setQueryName(existing.name);
      }
    }
  }, [queryId, queries]);

  useEffect(() => {
    if (!selectedDsId) return;
    datasourceAPIWithSchema.getSchema(selectedDsId)
      .then(res => setSchema(res.data))
      .catch(() => setSchema([]));
  }, [selectedDsId]);

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monaco.languages.registerCompletionItemProvider('sql', {
      provideCompletionItems: (model: any, position: any) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };
        const suggestions: any[] = [];
        schema.forEach(table => {
          suggestions.push({
            label: table.table_name,
            kind: monaco.languages.CompletionItemKind.Module,
            insertText: table.table_name,
            range,
          });
          table.columns.forEach(col => {
            suggestions.push({
              label: col.name,
              kind: monaco.languages.CompletionItemKind.Field,
              detail: col.data_type,
              insertText: col.name,
              range,
            });
          });
        });
        return { suggestions };
      },
    });
  };

  const handleRun = async () => {
    if (!selectedDsId || !sqlText.trim()) return;
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await queryAPI.executeAdHoc({
        datasource_id: selectedDsId,
        sql_text: sqlText,
      });
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setRunning(false);
    }
  };

  const handleSave = async () => {
    if (!selectedDsId || !sqlText.trim() || !queryName.trim()) {
      setError('Provide a name, datasource, and SQL');
      return;
    }
    const payload: CreateQueryPayload = {
      datasource_id: selectedDsId,
      name: queryName,
      sql_text: sqlText,
    };
    try {
      if (queryId) {
        await dispatch(updateQuery({ id: queryId, data: payload })).unwrap();
        dispatch(addToast({ message: 'Query updated', type: 'success' }));
      } else {
        await dispatch(createQuery(payload)).unwrap();
        dispatch(addToast({ message: 'Query created', type: 'success' }));
      }
      navigate('/queries');
    } catch (err: any) {
      setError(err.message || 'Save failed');
      dispatch(addToast({ message: err.message || 'Save failed', type: 'error' }));
    }
  };

  return (
    <div className="query-editor-page">
      {/* Back button */}
      <button
        type="button"
        className="back-btn"
        onClick={() => navigate('/queries')}
      >
        Back to Queries
      </button>

      <div className="query-toolbar">
        <select value={selectedDsId} onChange={e => setSelectedDsId(e.target.value)}>
          <option value="">-- Select Datasource --</option>
          {datasources.map(ds => (
            <option key={ds.id} value={ds.id}>{ds.name} ({ds.type})</option>
          ))}
        </select>
        <input placeholder="Query name" value={queryName} onChange={e => setQueryName(e.target.value)} />
        <button className="run-btn" onClick={handleRun} disabled={running || !selectedDsId}>
          {running ? 'Running...' : 'Run'}
        </button>
        <button className="save-btn" onClick={handleSave}>Save</button>
      </div>

      <div className="editor-container">
        <MonacoEditor
          height="300px"
          language="sql"
          value={sqlText}
          onChange={val => setSqlText(val || '')}
          onMount={handleEditorMount}
          options={{ minimap: { enabled: false }, fontSize: 14 }}
        />
      </div>

      {error && <div className="error-message">{error}</div>}

      {result && (
        <div className="results-panel">
          <h3>Results ({result.rows.length} rows)</h3>
          <div className="table-scroll">
            <table className="result-table">
              <thead>
                <tr>
                  {result.columns.map(col => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j}>
                        {cell === null ? 'NULL' : String(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default QueryEditor;