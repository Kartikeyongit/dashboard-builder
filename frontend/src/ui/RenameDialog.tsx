import React, { useState } from 'react';
import Dialog from './Dialog';
import Button from './Button';
import Field, { Input } from './Field';

interface RenameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  label?: string;
  initialValue: string;
  placeholder?: string;
  /** Throw an Error with a readable message to keep the dialog open. */
  onSave: (name: string) => Promise<void>;
}

/**
 * Shared rename flow. Every list opens the same dialog so validation, loading,
 * and error behaviour stay consistent.
 */
const RenameDialog: React.FC<RenameDialogProps> = ({
  open,
  onOpenChange,
  title = 'Rename',
  description = 'Choose a clear name. Links and IDs stay the same.',
  label = 'Name',
  initialValue,
  placeholder = 'Name',
  onSave,
}) => {
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seed the field from the current entity whenever the dialog opens or the
  // target changes. Doing it during render (guarded by a previous-value check)
  // keeps the first paint correct instead of flashing the stale value.
  const [lastSeed, setLastSeed] = useState({ open, initialValue });
  if (lastSeed.open !== open || lastSeed.initialValue !== initialValue) {
    setLastSeed({ open, initialValue });
    if (open) {
      setValue(initialValue);
      setError(null);
      setSaving(false);
    }
  }

  const handleSave = async () => {
    const name = value.trim();
    if (!name || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(name);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the new name.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!saving) onOpenChange(next);
      }}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            loading={saving}
            disabled={!value.trim() || value.trim() === initialValue.trim()}
          >
            Save
          </Button>
        </>
      }
    >
      <Field label={label} required error={error ?? undefined}>
        <Input
          autoFocus
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          onKeyDown={(event) => event.key === 'Enter' && handleSave()}
        />
      </Field>
    </Dialog>
  );
};

export default RenameDialog;
