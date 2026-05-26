import React, { useState } from 'react';
import { shareAPI } from '../../api/share';
import './ShareDialog.css';

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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Share Dashboard</h3>

        {link ? (
          <>
            <p style={{ color: '#475569', marginBottom: '0.5rem' }}>
              Shareable link (read‑only):
            </p>
            <div className="link-output">
              <input value={link} readOnly />
              <button
                className="modal-btn modal-btn--primary"
                style={{ flex: '0 0 auto', padding: '0.6rem 1rem' }}
                onClick={() => navigator.clipboard.writeText(link)}
              >
                Copy
              </button>
            </div>
            <div className="modal-actions">
              <button className="modal-btn modal-btn--secondary" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="modal-field">
              <label>Password (optional)</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave empty for public access"
              />
            </div>

            <div className="modal-field">
              <label>Expiry (optional)</label>
              <input
                type="datetime-local"
                value={expiry}
                onChange={(e) => setExpiry(new Date(e.target.value).toISOString())}
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="modal-actions">
              <button className="modal-btn modal-btn--primary" onClick={handleCreate}>
                Generate Link
              </button>
              <button className="modal-btn modal-btn--secondary" onClick={onClose}>
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ShareDialog;