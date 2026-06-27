import React, { useState, useRef, useEffect, useCallback } from 'react';
import './Dropdown.css';

export interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface DropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const Dropdown: React.FC<DropdownProps> = ({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selected = options.find(o => o.value === value);
  const selectedIndex = selected ? options.indexOf(selected) : -1;

  const close = useCallback(() => {
    setOpen(false);
    setHighlightedIndex(-1);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, close]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setOpen(true);
        setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < options.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev > 0 ? prev - 1 : options.length - 1
        );
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (highlightedIndex >= 0 && !options[highlightedIndex]?.disabled) {
          onChange(options[highlightedIndex].value);
          close();
        }
        break;
      case 'Escape':
        close();
        break;
    }
  };

  const handleOptionClick = (opt: DropdownOption) => {
    if (opt.disabled) return;
    onChange(opt.value);
    close();
  };

  return (
    <div
      ref={containerRef}
      className={`dropdown${className ? ` ${className}` : ''}`}
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        className={`dropdown-trigger${!selected ? ' dropdown-trigger--placeholder' : ''}`}
        onClick={() => !disabled && setOpen(prev => !prev)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{selected ? selected.label : (placeholder || 'Select...')}</span>
        <svg
          className={`dropdown-arrow${open ? ' dropdown-arrow--open' : ''}`}
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
        >
          <path
            d="M2 4l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          ref={menuRef}
          className="dropdown-menu"
          role="listbox"
        >
          {options.map((opt, i) => (
            <button
              key={opt.value}
              type="button"
              className={`dropdown-option${i === highlightedIndex ? ' dropdown-option--highlighted' : ''}${opt.value === value ? ' dropdown-option--selected' : ''}${opt.disabled ? ' dropdown-option--disabled' : ''}`}
              onClick={() => handleOptionClick(opt)}
              onMouseEnter={() => setHighlightedIndex(i)}
              role="option"
              aria-selected={opt.value === value}
              disabled={opt.disabled}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dropdown;
