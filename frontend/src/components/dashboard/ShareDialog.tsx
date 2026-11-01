import React, { useState } from 'react';
import { Check, Copy, Link2 } from 'lucide-react';
import { shareAPI } from '../../api/share';
import Dialog from '../../ui/Dialog';
import Button from '../../ui/Button';
import Field, { Input } from '../../ui/Field';
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
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    if (creating) return;
    setError('');

    let expiresAt: string | undefined;
    if (expiry) {
      const parsed = new Date(expiry);
      if (Number.isNaN(parsed.getTime())) {
        setError('Enter a valid expiry date and time.');
        return;
      }
      if (parsed.getTime() <= Date.now()) {
        setError('Expiry must be in the future.');
        return;
      }
      expiresAt = parsed.toISOString();
    }

    setCreating(true);
    try {
      const res = await shareAPI.create(dashboardId, {
        password: password || undefined,
        expires_at: expiresAt,
      });
      setLink(res.data.url);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create link');
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy automatically. Select the link and copy it manually.');
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title="Share dashboard"
      description="Anyone with the link can view this dashboard read-only. No account required."
      size="md"
      footer={
        link ? (
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose} disabled={creating}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreate} loading={creating}>
              <Link2 size={14} aria-hidden="true" />
              Generate link
            </Button>
          </>
        )
      }
    >
      {link ? (
        <>
          <div className="share-success">
            <Check size={14} aria-hidden="true" />
            Link created. It is active until you revoke it.
          </div>
          <Field label="Shareable link">
            <Input value={link} readOnly onFocus={(event) => event.currentTarget.select()} />
          </Field>
          <Button variant="secondary" onClick={handleCopy}>
            {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
            {copied ? 'Copied' : 'Copy link'}
          </Button>
        </>
      ) : (
        <>
          <Field
            label="Password (optional)"
            hint="Viewers must enter this password before the dashboard loads."
          >
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Leave empty for public access"
              autoComplete="new-password"
            />
          </Field>

          <Field
            label="Expiry (optional)"
            hint="The link stops working after this local date and time."
          >
            <Input
              type="datetime-local"
              value={expiry}
              onChange={(event) => setExpiry(event.target.value)}
            />
          </Field>

          {error && <p className="share-error" role="alert">{error}</p>}
        </>
      )}
    </Dialog>
  );
};

export default ShareDialog;
