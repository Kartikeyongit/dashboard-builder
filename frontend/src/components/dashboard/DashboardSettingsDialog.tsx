import React, { useState } from 'react';
import { useAppDispatch } from '../../hooks';
import { updateDashboard } from '../../store/dashboardSlice';
import { addToast } from '../../store/toastSlice';
import type { Dashboard } from '../../types';
import Dialog from '../../ui/Dialog';
import Button from '../../ui/Button';
import Field, { Input, Select, Textarea } from '../../ui/Field';
import './DashboardSettingsDialog.css';

const REFRESH_OPTIONS = [
  { value: 0, label: 'Off' },
  { value: 30, label: 'Every 30 seconds' },
  { value: 60, label: 'Every minute' },
  { value: 300, label: 'Every 5 minutes' },
  { value: 900, label: 'Every 15 minutes' },
  { value: 3600, label: 'Every hour' },
];

const MAX_DESCRIPTION = 500;
const MAX_TAGS = 10;

interface DashboardSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dashboard: Dashboard | null;
  /** Called after a successful save so local page state can sync too. */
  onSaved?: (dashboard: Dashboard) => void;
}

const splitTags = (value: string) =>
  value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

/**
 * Edit the library-facing metadata for a dashboard without opening the builder.
 * Available from list cards and from the view/editor headers.
 */
const DashboardSettingsDialog: React.FC<DashboardSettingsDialogProps> = ({
  open,
  onOpenChange,
  dashboard,
  onSaved,
}) => {
  const dispatch = useAppDispatch();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seed the form from the current dashboard whenever the dialog opens or the
  // target changes. Adjusting state during render (guarded by a previous-value
  // check) avoids a stale first paint and the extra effect render.
  const [lastSeed, setLastSeed] = useState<{ open: boolean; id?: string }>({
    open,
    id: dashboard?.id,
  });
  if (lastSeed.open !== open || lastSeed.id !== dashboard?.id) {
    setLastSeed({ open, id: dashboard?.id });
    if (open && dashboard) {
      setName(dashboard.name);
      setDescription(dashboard.description ?? '');
      setTags((dashboard.tags ?? []).join(', '));
      setRefresh(dashboard.refresh_interval_seconds ?? 0);
      setError(null);
      setSaving(false);
    }
  }

  const tagList = splitTags(tags);
  const tooManyTags = tagList.length > MAX_TAGS;

  const handleSave = async () => {
    if (!dashboard || saving) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Dashboard name is required.');
      return;
    }
    if (tooManyTags) {
      setError(`Use at most ${MAX_TAGS} tags.`);
      return;
    }

    setSaving(true);
    setError(null);
    const result = await dispatch(
      updateDashboard({
        id: dashboard.id,
        data: {
          name: trimmedName,
          description,
          tags: tagList,
          refresh_interval_seconds: refresh,
        },
      }),
    );
    setSaving(false);

    if (updateDashboard.fulfilled.match(result)) {
      dispatch(addToast({ message: 'Dashboard settings saved', type: 'success' }));
      onSaved?.(result.payload);
      onOpenChange(false);
    } else {
      setError('Could not save dashboard settings. Try again.');
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!saving) onOpenChange(next);
      }}
      title="Dashboard settings"
      description="Name, description, tags, and refresh behaviour for this dashboard."
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} loading={saving} disabled={!name.trim()}>
            Save changes
          </Button>
        </>
      }
    >
      <div className="dashboard-settings">
        <Field label="Name" required error={error ?? undefined}>
          <Input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Weekly revenue"
            onKeyDown={(event) => event.key === 'Enter' && handleSave()}
          />
        </Field>

        <Field
          label="Description"
          hint={`${description.length}/${MAX_DESCRIPTION} characters. Shown on the library card.`}
        >
          <Textarea
            value={description}
            maxLength={MAX_DESCRIPTION}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What does this dashboard answer?"
          />
        </Field>

        <Field
          label="Tags"
          hint="Comma separated, up to 10. Use them to find related dashboards."
          error={tooManyTags ? `Use at most ${MAX_TAGS} tags.` : undefined}
        >
          <Input
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="sales, weekly, finance"
          />
        </Field>

        <Field label="Auto refresh" hint="Widgets refresh on this interval while the dashboard is open.">
          <Select value={refresh} onChange={(event) => setRefresh(Number(event.target.value))}>
            {REFRESH_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </Dialog>
  );
};

export default DashboardSettingsDialog;
