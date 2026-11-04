import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Dialog from './Dialog';
import Button from './Button';
import './DependencyDialog.css';

export interface DependencyGroup {
  label: string;
  items: Array<{ id: string; label: string; meta?: string }>;
}

interface Props {
  open: boolean;
  title: string;
  description: React.ReactNode;
  groups: DependencyGroup[];
  onClose: () => void;
}

/**
 * Explains why a delete is blocked. Destructive actions in this app never
 * cascade silently, so the caller passes the real dependency list instead of
 * showing a generic "in use" toast.
 */
const DependencyDialog: React.FC<Props> = ({ open, title, description, groups, onClose }) => {
  const visibleGroups = groups.filter((group) => group.items.length > 0);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={title}
      description={description}
      size="md"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="dependency-warning">
        <AlertTriangle size={16} aria-hidden="true" />
        <span>Remove the dependencies below before deleting. Nothing was changed.</span>
      </div>

      <div className="dependency-groups">
        {visibleGroups.map((group) => (
          <section className="dependency-group" key={group.label}>
            <h4>
              {group.label}
              <span className="dependency-count">{group.items.length}</span>
            </h4>
            <ul>
              {group.items.map((item) => (
                <li key={`${group.label}-${item.id}-${item.label}`}>
                  <span className="dependency-name">{item.label}</span>
                  {item.meta && <span className="dependency-meta">{item.meta}</span>}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Dialog>
  );
};

export default DependencyDialog;
