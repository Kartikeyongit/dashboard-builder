import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import type { LucideIcon } from 'lucide-react';
import { CornerDownLeft, Search } from 'lucide-react';
import clsx from 'clsx';
import './CommandPalette.css';

export interface CommandItem {
  id: string;
  label: string;
  group: string;
  icon?: LucideIcon;
  hint?: string;
  keywords?: string;
  run: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CommandItem[];
}

/**
 * Keyboard-first launcher. Ctrl/Cmd+K opens it from the shell; typing filters
 * actions and entities, and Enter runs the highlighted row.
 */
const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onOpenChange, items }) => {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) =>
      [item.label, item.group, item.keywords].some((value) =>
        (value ?? '').toLowerCase().includes(needle),
      ),
    );
  }, [items, query]);

  // Reset the query and highlight when the palette opens, and move the
  // highlight back to the top whenever the filter changes. Adjusting state
  // during render (guarded by a previous-value check) avoids an extra render
  // pass and the flicker of an effect-driven reset.
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setQuery('');
      setActive(0);
    }
  }

  const [lastQuery, setLastQuery] = useState(query);
  if (query !== lastQuery) {
    setLastQuery(query);
    setActive(0);
  }

  useEffect(() => {
    itemRefs.current[active]?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const run = (item: CommandItem | undefined) => {
    if (!item) return;
    onOpenChange(false);
    item.run();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((current) => (filtered.length === 0 ? 0 : (current + 1) % filtered.length));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((current) =>
        filtered.length === 0 ? 0 : (current - 1 + filtered.length) % filtered.length,
      );
    } else if (event.key === 'Enter') {
      event.preventDefault();
      run(filtered[active]);
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="ui-command__overlay" />
        <DialogPrimitive.Content className="ui-command" aria-describedby={undefined}>
          <DialogPrimitive.Title className="ui-command__sr-only">
            Command palette
          </DialogPrimitive.Title>
          <div className="ui-command__search">
            <Search size={17} aria-hidden="true" className="ui-command__search-icon" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search dashboards, pages, and actions…"
              aria-label="Search commands"
              className="ui-command__input"
            />
            <kbd className="ui-command__kbd">Esc</kbd>
          </div>

          <div className="ui-command__list" role="listbox" aria-label="Commands">
            {filtered.length === 0 && (
              <p className="ui-command__empty">No matches. Try a dashboard name or page.</p>
            )}
            {filtered.map((item, index) => {
              const Icon = item.icon;
              const showGroup = index === 0 || filtered[index - 1].group !== item.group;
              return (
                <React.Fragment key={item.id}>
                  {showGroup && <p className="ui-command__group">{item.group}</p>}
                  <button
                    type="button"
                    role="option"
                    aria-selected={index === active}
                    ref={(element) => {
                      itemRefs.current[index] = element;
                    }}
                    className={clsx('ui-command__item', index === active && 'ui-command__item--active')}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => run(item)}
                  >
                    {Icon && <Icon size={16} aria-hidden="true" className="ui-command__item-icon" />}
                    <span className="ui-command__item-label">{item.label}</span>
                    {item.hint && <span className="ui-command__item-hint">{item.hint}</span>}
                    {index === active && (
                      <CornerDownLeft size={13} aria-hidden="true" className="ui-command__enter" />
                    )}
                  </button>
                </React.Fragment>
              );
            })}
          </div>

          <div className="ui-command__footer">
            <span><kbd>↑</kbd><kbd>↓</kbd> to navigate</span>
            <span><kbd>↵</kbd> to open</span>
            <span><kbd>esc</kbd> to close</span>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default CommandPalette;
