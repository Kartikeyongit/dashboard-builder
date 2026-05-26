import React, { useState } from 'react';
import { shareAPI } from '../../api/share';

interface Props {
  dashboardId: string;
  onClose: () => void;
}

const ShareDialog: React.FC<Props> = ({ dashboardId, onClose }) => {
  const [password, setPassword] = useState('');
  const [expiry, setExpiry] = useState('');
  const [link, setLink] = useState('');
  const [error, setError] = useState('');

  const handleCreate = async () => {
    try {
      const res = await shareAPI.create(dashboardId, {
        password: password || undefined,
        expires_at: expiry || undefined,
      });
      setLink(res.data.url);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create link');
    }
  };

  return (
    <div style={{ position: 'fixed', top: '20%', left: '30%', background: 'white', padding: 20, border: '1px solid #ccc', zIndex: 1000 }}>
      <h3>Share Dashboard</h3>
      {link ? (
        <div>
          <p>Shareable link (read‑only):</p>
          <input value={link} readOnly style={{ width: '100%' }} />
          <button onClick={() => navigator.clipboard.writeText(link)}>Copy</button>
          <button onClick={onClose}>Close</button>
        </div>
      ) : (
        <div>
          <label>
            Password (optional):
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
          </label>
          <br />
          <label>
            Expiry (ISO date, optional):
            <input type="datetime-local" value={expiry} onChange={e => setExpiry(new Date(e.target.value).toISOString())} />
          </label>
          <br />
          <button onClick={handleCreate}>Generate Link</button>
          <button onClick={onClose}>Cancel</button>
          {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
      )}
    </div>
  );
};

export default ShareDialog;