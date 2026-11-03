import React, { useCallback, useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import {
  Check,
  Clock,
  Code2,
  Copy,
  Eye,
  KeyRound,
  Link2,
  Lock,
  Plus,
  QrCode,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { shareAPI } from '../../api/share';
import type { ShareLink } from '../../types';
import Dialog from '../../ui/Dialog';
import Button from '../../ui/Button';
import Field, { Input } from '../../ui/Field';
import { apiErrorMessage } from '../../utils/apiError';
import { relativeTime } from '../../utils/format';
import './ShareDialog.css';

interface Props {
  dashboardId: string;
  onClose: () => void;
}

const EXPIRY_PRESETS: Array<{ label: string; days: number }> = [
  { label: '1 day', days: 1 },
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: 'Never', days: 0 },
];

/** Converts a Date into the local `YYYY-MM-DDTHH:mm` shape datetime-local wants. */
const toLocalInputValue = (date: Date): string => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

const expiryLabel = (link: ShareLink): string => {
  if (!link.expires_at) return 'No expiry';
  const date = new Date(link.expires_at);
  if (Number.isNaN(date.getTime())) return 'No expiry';
  const diff = date.getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  if (diff < 60 * 60 * 1000) {
    return `Expires in ${Math.max(1, Math.round(diff / 60_000))} min`;
  }
  if (diff < 24 * 60 * 60 * 1000) {
    return `Expires in ${Math.round(diff / 3_600_000)} hr`;
  }
  const days = Math.round(diff / 86_400_000);
  return `Expires in ${days} ${days === 1 ? 'day' : 'days'}`;
};

const statusFor = (link: ShareLink): { label: string; tone: 'active' | 'expired' | 'revoked' } => {
  if (!link.is_active) return { label: 'Revoked', tone: 'revoked' };
  if (link.expires_at && new Date(link.expires_at).getTime() <= Date.now()) {
    return { label: 'Expired', tone: 'expired' };
  }
  return { label: 'Active', tone: 'active' };
};

const embedSnippet = (url: string): string =>
  `<iframe src="${url}${url.includes('?') ? '&' : '?'}embed=1" title="Dashboard" width="100%" height="640" style="border:0;border-radius:12px" loading="lazy"></iframe>`;

const ShareDialog: React.FC<Props> = ({ dashboardId, onClose }) => {
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(true);
  const [listError, setListError] = useState('');
  const [password, setPassword] = useState('');
  const [expiry, setExpiry] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [qr, setQr] = useState<{ id: string; dataUrl: string } | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const loadLinks = useCallback(async (): Promise<ShareLink[]> => {
    setListError('');
    try {
      const res = await shareAPI.list(dashboardId);
      const next = res.data.links ?? [];
      setLinks(next);
      return next;
    } catch (err) {
      setListError(apiErrorMessage(err, 'Could not load share links'));
      return [];
    } finally {
      setLoadingLinks(false);
    }
  }, [dashboardId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial list load is the purpose of this effect
    loadLinks();
  }, [loadLinks]);

  const expandedLink = useMemo(
    () => links.find((link) => link.id === expandedId) ?? null,
    [links, expandedId],
  );

  useEffect(() => {
    if (!expandedLink?.url) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear the previous QR before generating a new one
      setQr(null);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(expandedLink.url, {
      margin: 1,
      width: 180,
      color: { dark: '#111827', light: '#ffffff' },
    })
      .then((dataUrl) => {
        if (!cancelled) setQr({ id: expandedLink.id, dataUrl });
      })
      .catch(() => {
        if (!cancelled) setQr(null);
      });
    return () => {
      cancelled = true;
    };
  }, [expandedLink]);

  const applyPreset = (days: number) => {
    if (days === 0) {
      setExpiry('');
      return;
    }
    const date = new Date();
    date.setDate(date.getDate() + days);
    setExpiry(toLocalInputValue(date));
  };

  const handleCreate = async () => {
    if (creating) return;
    setCreateError('');

    let expiresAt: string | undefined;
    if (expiry) {
      const parsed = new Date(expiry);
      if (Number.isNaN(parsed.getTime())) {
        setCreateError('Enter a valid expiry date and time.');
        return;
      }
      if (parsed.getTime() <= Date.now()) {
        setCreateError('Expiry must be in the future.');
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
      setPassword('');
      setExpiry('');
      const next = await loadLinks();
      const created = next.find((link) => link.url === res.data.url);
      if (created) {
        setCreatedId(created.id);
        setExpandedId(created.id);
      }
    } catch (err) {
      setCreateError(apiErrorMessage(err, 'Failed to create link'));
    } finally {
      setCreating(false);
    }
  };

  const copyText = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied((current) => (current === key ? null : current)), 2000);
    } catch {
      setCreateError('Could not copy automatically. Select the text and copy it manually.');
    }
  };

  const handleRevoke = async (link: ShareLink) => {
    setRevoking(link.id);
    setListError('');
    try {
      await shareAPI.revoke(dashboardId, link.id);
      setConfirmRevoke(null);
      if (expandedId === link.id) setExpandedId(null);
      await loadLinks();
    } catch (err) {
      setListError(apiErrorMessage(err, 'Could not revoke the link'));
    } finally {
      setRevoking(null);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title="Share dashboard"
      description="Anyone with a link can view this dashboard read-only. Revoke a link at any time."
      size="lg"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Done
        </Button>
      }
    >
      <section className="share-create" aria-labelledby="share-create-heading">
        <div className="share-section-heading">
          <h3 id="share-create-heading">Create a link</h3>
          <span className="share-section-hint">No account required</span>
        </div>

        <div className="share-create-grid">
          <Field
            label="Password (optional)"
            hint="Viewers must enter this before the dashboard loads."
          >
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Leave empty for public access"
              autoComplete="new-password"
            />
          </Field>

          <Field label="Expiry (optional)" hint="The link stops working after this local time.">
            <Input
              type="datetime-local"
              value={expiry}
              onChange={(event) => setExpiry(event.target.value)}
            />
          </Field>
        </div>

        <div className="share-presets" aria-label="Expiry presets">
          {EXPIRY_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className="share-preset"
              onClick={() => applyPreset(preset.days)}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {createError && <p className="share-error" role="alert">{createError}</p>}

        <Button variant="primary" onClick={handleCreate} loading={creating}>
          <Plus size={14} aria-hidden="true" />
          Generate link
        </Button>
      </section>

      <section className="share-links" aria-labelledby="share-links-heading">
        <div className="share-section-heading">
          <h3 id="share-links-heading">Existing links</h3>
          <button
            type="button"
            className="share-refresh"
            onClick={loadLinks}
            disabled={loadingLinks}
            aria-label="Refresh share links"
            title="Refresh share links"
          >
            <RefreshCw size={13} aria-hidden="true" />
          </button>
        </div>

        {loadingLinks && <p className="share-muted">Loading links…</p>}
        {listError && <p className="share-error" role="alert">{listError}</p>}

        {!loadingLinks && links.length === 0 && (
          <p className="share-muted">No links yet. Generate one above to share this dashboard.</p>
        )}

        <ul className="share-link-list">
          {links.map((link) => {
            const status = statusFor(link);
            const isExpanded = expandedId === link.id;
            return (
              <li
                key={link.id}
                className={`share-link${createdId === link.id ? ' share-link--new' : ''}`}
              >
                <div className="share-link-main">
                  <div className="share-link-icon" aria-hidden="true">
                    {link.password_protected ? <Lock size={15} /> : <Link2 size={15} />}
                  </div>
                  <div className="share-link-info">
                    <div className="share-link-title">
                      <span className={`share-status share-status--${status.tone}`}>{status.label}</span>
                      {link.password_protected && (
                        <span className="share-meta">
                          <KeyRound size={11} aria-hidden="true" /> Password
                        </span>
                      )}
                      <span className="share-meta">
                        <Clock size={11} aria-hidden="true" />
                        {link.last_used_at
                          ? `Used ${relativeTime(link.last_used_at)}`
                          : 'Never used'}
                      </span>
                    </div>
                    <div className="share-link-sub">
                      Created {relativeTime(link.created_at)} · {expiryLabel(link)}
                      {!link.token_available && ' · Legacy link — recreate to copy'}
                    </div>
                  </div>
                  <div className="share-link-actions">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={!link.token_available || !link.is_active}
                      title={
                        !link.token_available
                          ? 'This legacy link cannot be copied. Create a new link instead.'
                          : !link.is_active
                            ? 'Revoked links cannot be copied.'
                            : 'Copy link'
                      }
                      onClick={() => copyText(link.url, `copy-${link.id}`)}
                    >
                      {copied === `copy-${link.id}` ? (
                        <Check size={13} aria-hidden="true" />
                      ) : (
                        <Copy size={13} aria-hidden="true" />
                      )}
                      {copied === `copy-${link.id}` ? 'Copied' : 'Copy'}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={!link.token_available}
                      onClick={() => setExpandedId(isExpanded ? null : link.id)}
                      aria-expanded={isExpanded}
                    >
                      <QrCode size={13} aria-hidden="true" />
                      Share
                    </Button>
                    {link.is_active && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setConfirmRevoke(link.id)}
                        aria-label="Revoke link"
                      >
                        <Trash2 size={13} aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                </div>

                {confirmRevoke === link.id && (
                  <div className="share-confirm" role="alert">
                    <span>Revoke this link? Anyone using it will lose access immediately.</span>
                    <div className="share-confirm-actions">
                      <Button size="sm" variant="secondary" onClick={() => setConfirmRevoke(null)}>
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        loading={revoking === link.id}
                        onClick={() => handleRevoke(link)}
                      >
                        Revoke
                      </Button>
                    </div>
                  </div>
                )}

                {isExpanded && link.url && (
                  <div className="share-expanded">
                    <div className="share-qr">
                      {qr?.id === link.id ? (
                        <img src={qr.dataUrl} alt="QR code for this share link" width={140} height={140} />
                      ) : (
                        <div className="share-qr-placeholder" aria-hidden="true">
                          <QrCode size={28} />
                        </div>
                      )}
                      <span>Scan to open</span>
                    </div>

                    <div className="share-expanded-fields">
                      <Field label="Shareable link">
                        <Input
                          value={link.url}
                          readOnly
                          onFocus={(event) => event.currentTarget.select()}
                        />
                      </Field>
                      <Field label="Iframe embed" hint="Paste this into a site or wiki to embed the dashboard.">
                        <div className="share-embed-row">
                          <Input value={embedSnippet(link.url)} readOnly onFocus={(event) => event.currentTarget.select()} />
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => copyText(embedSnippet(link.url), `embed-${link.id}`)}
                            aria-label="Copy iframe embed code"
                          >
                            {copied === `embed-${link.id}` ? (
                              <Check size={13} aria-hidden="true" />
                            ) : (
                              <Code2 size={13} aria-hidden="true" />
                            )}
                          </Button>
                        </div>
                      </Field>
                      <a className="share-preview-link" href={link.url} target="_blank" rel="noreferrer">
                        <Eye size={13} aria-hidden="true" /> Open shared view
                      </a>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </Dialog>
  );
};

export default ShareDialog;
