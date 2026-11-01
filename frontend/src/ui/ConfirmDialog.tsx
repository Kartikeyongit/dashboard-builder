import React from 'react';
import Dialog from './Dialog';
import Button from './Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Use the danger style for destructive actions. */
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Replacement for `window.confirm`: blocking, keyboard accessible, and styled
 * consistently with the rest of the app.
 */
const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}) => (
  <Dialog
    open={open}
    onOpenChange={(next) => {
      if (!next && !loading) onCancel();
    }}
    title={title}
    description={description}
    size="sm"
    footer={
      <>
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          variant={destructive ? 'danger' : 'primary'}
          onClick={onConfirm}
          loading={loading}
        >
          {confirmLabel}
        </Button>
      </>
    }
  >
    {children}
  </Dialog>
);

export default ConfirmDialog;
