import React from 'react';
import { Search, X } from 'lucide-react';
import './ListToolbar.css';

export interface SortOption {
  value: string;
  label: string;
}

interface ListToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  sortValue?: string;
  sortOptions?: SortOption[];
  onSortChange?: (value: string) => void;
  count: number;
  countLabel: (count: number) => string;
  /** Extra filters such as a "Favorites" toggle. */
  children?: React.ReactNode;
}

/**
 * One toolbar for every library list so search, sort, and counts behave the
 * same on dashboards, queries, and datasources.
 */
const ListToolbar: React.FC<ListToolbarProps> = ({
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  sortValue,
  sortOptions,
  onSortChange,
  count,
  countLabel,
  children,
}) => (
  <div className="ui-list-toolbar">
    <div className="ui-list-toolbar__search">
      <Search size={15} aria-hidden="true" className="ui-list-toolbar__search-icon" />
      <input
        type="search"
        className="ui-list-toolbar__input"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={searchPlaceholder}
        aria-label={searchPlaceholder}
      />
      {search && (
        <button
          type="button"
          className="ui-list-toolbar__clear"
          onClick={() => onSearchChange('')}
          aria-label="Clear search"
        >
          <X size={13} aria-hidden="true" />
        </button>
      )}
    </div>

    {children}

    {sortOptions && sortValue !== undefined && onSortChange && (
      <label className="ui-list-toolbar__sort">
        <span className="ui-list-toolbar__sort-label">Sort</span>
        <select
          className="ui-list-toolbar__select"
          value={sortValue}
          onChange={(event) => onSortChange(event.target.value)}
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    )}

    <span className="ui-list-toolbar__count">{countLabel(count)}</span>
  </div>
);

export default ListToolbar;
