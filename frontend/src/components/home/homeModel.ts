import type { Dashboard } from '../../types';

export interface HomeCounts {
  dashboardCount: number;
  datasourceCount: number;
  queryCount: number;
}

export type HomeActionKind = 'datasource' | 'query' | 'dashboard';

export interface HomeAction {
  kind: HomeActionKind;
  label: string;
  description: string;
  to: string;
}

/**
 * The one action the header should offer. It follows the natural setup order
 * so the page never asks a new workspace to build a dashboard before it has
 * anything to build it from. Viewers get no create action.
 */
export function getPrimaryAction({
  canEdit,
  datasourceCount,
  queryCount,
}: {
  canEdit: boolean;
  datasourceCount: number;
  queryCount: number;
}): HomeAction | null {
  if (!canEdit) return null;

  if (datasourceCount === 0) {
    return {
      kind: 'datasource',
      label: 'Connect a datasource',
      description: 'Connect PostgreSQL or MySQL, then query it without moving the data.',
      to: '/datasources/new',
    };
  }

  if (queryCount === 0) {
    return {
      kind: 'query',
      label: 'Write a query',
      description: 'Save your first SQL query against a connected database.',
      to: '/queries/new',
    };
  }

  return {
    kind: 'dashboard',
    label: 'New dashboard',
    description: 'Turn your saved queries into a live dashboard.',
    to: '/dashboards?new=1',
  };
}

export type OnboardingStepId = 'datasource' | 'query' | 'dashboard';

export interface OnboardingStep {
  id: OnboardingStepId;
  title: string;
  description: string;
  action: string;
  to: string;
  done: boolean;
}

/** Three steps, in the order a workspace can actually complete them. */
export function buildOnboarding({
  datasourceCount,
  queryCount,
  dashboardCount,
}: HomeCounts): OnboardingStep[] {
  return [
    {
      id: 'datasource',
      title: 'Connect a datasource',
      description: 'Add a PostgreSQL or MySQL database.',
      action: 'Connect',
      to: '/datasources/new',
      done: datasourceCount > 0,
    },
    {
      id: 'query',
      title: 'Save a query',
      description: 'Write SQL and keep it for dashboards.',
      action: 'Write',
      to: '/queries/new',
      done: queryCount > 0,
    },
    {
      id: 'dashboard',
      title: 'Create a dashboard',
      description: 'Add widgets built from saved queries.',
      action: 'Create',
      to: '/dashboards?new=1',
      done: dashboardCount > 0,
    },
  ];
}

export function completedSteps(steps: OnboardingStep[]): number {
  return steps.filter((step) => step.done).length;
}

const updatedAt = (dashboard: Dashboard) => {
  const time = new Date(dashboard.updated_at).getTime();
  return Number.isNaN(time) ? 0 : time;
};

/**
 * One list instead of separate pinned and recent feeds: remove duplicate ids,
 * keep pinned dashboards first, then sort both groups by latest update, and
 * cap the result so the home page stays a launchpad.
 */
export function buildRecentDashboards(list: Dashboard[], limit = 5): Dashboard[] {
  const seen = new Set<string>();
  const unique = list.filter((dashboard) => {
    if (seen.has(dashboard.id)) return false;
    seen.add(dashboard.id);
    return true;
  });

  return unique
    .sort((a, b) => {
      const pinned = Number(Boolean(b.is_favorite)) - Number(Boolean(a.is_favorite));
      if (pinned !== 0) return pinned;
      return updatedAt(b) - updatedAt(a);
    })
    .slice(0, Math.max(0, limit));
}
