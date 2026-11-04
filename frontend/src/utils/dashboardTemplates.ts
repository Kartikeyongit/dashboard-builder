import type { CreateDashboardPayload } from '../api/dashboard';
import type { DashboardFilter } from '../types';

/**
 * Starting points for a new dashboard. Templates only seed metadata that the
 * create endpoint already accepts: name, description, tags, refresh interval,
 * and filter definitions. They deliberately do not create widgets, because a
 * widget needs a real saved query before it can render anything.
 */
export interface DashboardTemplate {
  id: string;
  label: string;
  description: string;
  /** Suggested dashboard name when the template is selected. */
  defaultName: string;
  /** Short list shown on the picker card. */
  highlights: string[];
  build: () => Omit<CreateDashboardPayload, 'name'>;
}

const filters = (...items: DashboardFilter[]): DashboardFilter[] => items;

export const DASHBOARD_TEMPLATES: DashboardTemplate[] = [
  {
    id: 'blank',
    label: 'Blank',
    description: 'Start with an empty canvas and add widgets yourself.',
    defaultName: '',
    highlights: ['No filters', 'Inherits default refresh'],
    build: () => ({}),
  },
  {
    id: 'weekly-review',
    label: 'Weekly review',
    description: 'A shareable summary for a recurring team check-in.',
    defaultName: 'Weekly review',
    highlights: ['Date range', 'Region filter', '5-minute refresh'],
    build: () => ({
      description: 'Weekly business review with a date range and region filter.',
      tags: ['weekly', 'business-review'],
      refresh_interval_seconds: 300,
      filters: filters(
        { id: 'start_date', label: 'From', type: 'date' },
        { id: 'end_date', label: 'To', type: 'date' },
        {
          id: 'region',
          label: 'Region',
          type: 'select',
          options: ['All regions', 'North America', 'Europe', 'Asia Pacific'],
          default: 'All regions',
        },
      ),
    }),
  },
  {
    id: 'operations',
    label: 'Operations monitor',
    description: 'A near-live view for service health and traffic.',
    defaultName: 'Operations monitor',
    highlights: ['Environment filter', '1-minute refresh', 'Ops tag'],
    build: () => ({
      description: 'Operational health and traffic, refreshed every minute.',
      tags: ['operations', 'live'],
      refresh_interval_seconds: 60,
      filters: filters({
        id: 'environment',
        label: 'Environment',
        type: 'select',
        options: ['Production', 'Staging', 'Development'],
        default: 'Production',
      }),
    }),
  },
  {
    id: 'customer-insights',
    label: 'Customer insights',
    description: 'Track acquisition, retention, and segment performance.',
    defaultName: 'Customer insights',
    highlights: ['Segment filter', 'Date range', '15-minute refresh'],
    build: () => ({
      description: 'Customer growth and retention by segment.',
      tags: ['customers', 'growth'],
      refresh_interval_seconds: 900,
      filters: filters(
        { id: 'start_date', label: 'From', type: 'date' },
        { id: 'end_date', label: 'To', type: 'date' },
        { id: 'segment', label: 'Segment', type: 'text' },
      ),
    }),
  },
];

export const DEFAULT_TEMPLATE_ID = 'blank';

export function getDashboardTemplate(id: string): DashboardTemplate {
  return DASHBOARD_TEMPLATES.find((template) => template.id === id) ?? DASHBOARD_TEMPLATES[0];
}

/**
 * Combine the chosen template with the name typed in the dialog. A blank name
 * falls back to the template's suggested name, then to a generic one.
 */
export function templatePayload(id: string, name: string): CreateDashboardPayload {
  const template = getDashboardTemplate(id);
  const trimmed = name.trim();
  return {
    name: trimmed || template.defaultName || 'Untitled dashboard',
    ...template.build(),
  };
}
