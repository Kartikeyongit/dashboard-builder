import React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import clsx from 'clsx';
import './Dialog.css';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** Hide the corner close button when the dialog must be answered explicitly. */
  hideClose?: boolean;
}

/**
 * Accessible modal built on Radix Dialog: focus trap, Escape to close, focus
 * restoration, and aria-modal semantics come for free.
 */
const Dialog: React.FC<DialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
  hideClose = false,
}) => (
  <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="ui-dialog__overlay" />
      <DialogPrimitive.Content className={clsx('ui-dialog', `ui-dialog--${size}`)}>
        <div className="ui-dialog__header">
          <div className="ui-dialog__heading">
            <DialogPrimitive.Title className="ui-dialog__title">{title}</DialogPrimitive.Title>
            {description && (
              <DialogPrimitive.Description className="ui-dialog__description">
                {description}
              </DialogPrimitive.Description>
            )}
          </div>
          {!hideClose && (
            <DialogPrimitive.Close asChild>
              <button type="button" className="ui-dialog__close" aria-label="Close dialog">
                <X size={16} aria-hidden="true" />
              </button>
            </DialogPrimitive.Close>
          )}
        </div>
        {children && <div className="ui-dialog__body">{children}</div>}
        {footer && <div className="ui-dialog__footer">{footer}</div>}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>
);

export default Dialog;
