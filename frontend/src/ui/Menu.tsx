import React from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import type { LucideIcon } from 'lucide-react';
import clsx from 'clsx';
import './Menu.css';

export interface MenuItem {
  key: string;
  label: string;
  icon?: LucideIcon;
  onSelect?: () => void;
  danger?: boolean;
  disabled?: boolean;
  /** Draw a divider above this item. */
  separatorBefore?: boolean;
}

export interface MenuProps {
  /** A single element; Radix wires the trigger behaviour onto it. */
  trigger: React.ReactElement;
  items: MenuItem[];
  /** Non-interactive content rendered above the items, such as an identity. */
  header?: React.ReactNode;
  align?: 'start' | 'center' | 'end';
  /** Accessible name for the menu. */
  label?: string;
  className?: string;
}

/**
 * Accessible action menu built on Radix DropdownMenu: arrow-key navigation,
 * typeahead, Escape, and focus restoration come from the primitive.
 */
const Menu: React.FC<MenuProps> = ({
  trigger,
  items,
  header,
  align = 'end',
  label = 'Actions',
  className,
}) => (
  <DropdownMenu.Root>
    <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        className={clsx('ui-menu', className)}
        align={align}
        sideOffset={6}
        aria-label={label}
      >
        {header && (
          <>
            <DropdownMenu.Label className="ui-menu__header">{header}</DropdownMenu.Label>
            <DropdownMenu.Separator className="ui-menu__separator" />
          </>
        )}
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <React.Fragment key={item.key}>
              {item.separatorBefore && <DropdownMenu.Separator className="ui-menu__separator" />}
              <DropdownMenu.Item
                className={clsx('ui-menu__item', item.danger && 'ui-menu__item--danger')}
                disabled={item.disabled}
                onSelect={() => item.onSelect?.()}
              >
                {Icon && <Icon size={15} aria-hidden="true" className="ui-menu__icon" />}
                <span>{item.label}</span>
              </DropdownMenu.Item>
            </React.Fragment>
          );
        })}
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>
);

export default Menu;
