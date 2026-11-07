/**
 * Signed-in home behaviour.
 *
 * Every request is intercepted so the spec does not depend on the seeded API.
 * Fixtures use fixed ISO timestamps; the home page never asserts relative time
 * here, which keeps the suite stable without freezing the app clock.
 */
const ORG_ID = 'org-home';

const USER = {
  id: 'user-1',
  org_id: ORG_ID,
  email: 'admin@acme.com',
  role: 'admin',
  created_at: '2026-01-01T00:00:00Z',
};

interface HomeApiOptions {
  role?: 'admin' | 'editor' | 'viewer';
  dashboards?: Record<string, unknown>[];
  datasources?: Record<string, unknown>[];
  queries?: Record<string, unknown>[];
  events?: Record<string, unknown>[];
  failDashboardFirst?: boolean;
  dashboardDelay?: number;
}

const makeDashboard = (
  id: string,
  name: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  id,
  org_id: ORG_ID,
  name,
  description: '',
  tags: [],
  refresh_interval_seconds: 0,
  is_favorite: false,
  widget_count: 1,
  created_by: 'user-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
  ...overrides,
});

const makeDatasource = (id: string, name = 'Warehouse'): Record<string, unknown> => ({
  id,
  org_id: ORG_ID,
  name,
  type: 'postgres',
  host: 'db.internal',
  port: 5432,
  db_name: 'analytics',
  username: 'reader',
  ssl_mode: 'require',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
});

const makeQuery = (id: string, name = 'Revenue by month'): Record<string, unknown> => ({
  id,
  org_id: ORG_ID,
  datasource_id: 'ds-1',
  name,
  sql_text: 'select 1',
  max_rows: 1000,
  timeout_ms: 5000,
  created_by: 'user-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
});

const makeEvent = (id: string, action: string, target: string): Record<string, unknown> => ({
  id,
  org_id: ORG_ID,
  actor_id: 'user-1',
  actor_email: 'admin@acme.com',
  action,
  target_type: 'dashboard',
  target_id: 'd-1',
  target_name: target,
  metadata: {},
  created_at: '2026-03-09T10:00:00Z',
});

const stubApi = (options: HomeApiOptions = {}) => {
  const {
    role = 'admin',
    dashboards = [],
    datasources = [],
    queries = [],
    events = [],
    failDashboardFirst = false,
    dashboardDelay = 0,
  } = options;

  cy.intercept('GET', '**/api/v1/me', {
    body: {
      ...USER,
      role,
      email: role === 'viewer' ? 'viewer@acme.com' : USER.email,
    },
  }).as('me');

  let dashboardCalls = 0;
  cy.intercept('GET', '**/api/v1/dashboards', (request) => {
    dashboardCalls += 1;
    if (failDashboardFirst && dashboardCalls === 1) {
      request.reply({ statusCode: 500, body: { error: 'library unavailable' } });
      return;
    }
    request.reply({ delay: dashboardDelay, body: dashboards });
  }).as('dashboards');

  cy.intercept('GET', '**/api/v1/datasources', { body: datasources }).as('datasources');
  cy.intercept('GET', '**/api/v1/queries', { body: queries }).as('queries');
  cy.intercept('GET', '**/api/v1/team/audit*', { body: { events } }).as('audit');
};

const visitHome = ({
  dismissed = false,
  theme = 'light',
}: { dismissed?: boolean; theme?: 'light' | 'dark' } = {}) => {
  cy.visit('/', {
    onBeforeLoad(win) {
      win.localStorage.setItem('access_token', 'test-access-token');
      win.localStorage.setItem('refresh_token', 'test-refresh-token');
      win.localStorage.setItem('dashboard-builder-theme', theme);
      if (dismissed) {
        win.localStorage.setItem('dashboard-builder-onboarding-dismissed', '1');
      } else {
        win.localStorage.removeItem('dashboard-builder-onboarding-dismissed');
      }
    },
  });
  cy.wait('@me');
  cy.get('.home-header__title', { timeout: 20000 }).should('be.visible');
};

const waitForLibraries = () => {
  cy.wait(['@dashboards', '@datasources', '@queries']);
  cy.get('.home-summary', { timeout: 20000 }).should('be.visible');
};

describe('signed-in home', () => {
  beforeEach(() => {
    cy.viewport(1280, 800);
  });

  it('offers the next action and one capped recent list', () => {
    stubApi({
      dashboards: [
        makeDashboard('d-pinned', 'Pinned roadmap', { is_favorite: true, updated_at: '2026-03-01T00:00:00Z' }),
        makeDashboard('d-1', 'Revenue overview', { widget_count: 4, updated_at: '2026-03-10T00:00:00Z' }),
        makeDashboard('d-2', 'Ops health', { updated_at: '2026-03-09T00:00:00Z' }),
        makeDashboard('d-3', 'Customer churn', { updated_at: '2026-03-08T00:00:00Z' }),
        makeDashboard('d-4', 'Marketing funnel', { updated_at: '2026-03-07T00:00:00Z' }),
        makeDashboard('d-5', 'Finance close', { updated_at: '2026-03-06T00:00:00Z' }),
      ],
      datasources: [makeDatasource('ds-1')],
      queries: [makeQuery('q-1')],
      events: [
        makeEvent('e-1', 'dashboard.updated', 'Revenue overview'),
        makeEvent('e-2', 'share.created', 'Sales share link'),
      ],
    });

    visitHome();
    waitForLibraries();

    cy.get('.home-primary')
      .should('contain', 'New dashboard')
      .and('have.attr', 'href', '/dashboards?new=1');
    cy.get('.home-summary a').should('have.length', 3);
    cy.get('.home-summary a').eq(0).should('contain', '6');

    cy.get('.home-recent__row').should('have.length', 5);
    cy.get('.home-recent__name').first().should('contain', 'Pinned roadmap');
    cy.get('.home-recent__row').first().should('have.attr', 'href', '/dashboards/d-pinned');
    cy.get('.home-recent__name').last().should('contain', 'Marketing funnel');

    cy.wait('@audit');
    cy.get('.home-activity__item').should('have.length', 2);
    cy.contains('.home-activity__item', 'Revenue overview').should('be.visible');
  });

  it('starts a new workspace with the datasource flow', () => {
    stubApi();

    visitHome();
    waitForLibraries();

    cy.get('.home-primary')
      .should('contain', 'Connect a datasource')
      .and('have.attr', 'href', '/datasources/new');
    cy.get('.home-step').should('have.length', 3);
    cy.contains('.home-step__action', 'Connect').should('be.visible');
    cy.contains('No dashboards yet').should('be.visible');

    cy.wait('@audit');
    cy.contains('No team activity yet').should('be.visible');
  });

  it('asks for a query once a datasource exists', () => {
    stubApi({ datasources: [makeDatasource('ds-1')] });

    visitHome();
    waitForLibraries();

    cy.get('.home-primary')
      .should('contain', 'Write a query')
      .and('have.attr', 'href', '/queries/new');
    cy.get('.home-step').eq(0).should('have.class', 'home-step--done');
    cy.get('.home-step').eq(1).should('not.have.class', 'home-step--done');
  });

  it('hides the checklist when every step is done', () => {
    stubApi({
      dashboards: [makeDashboard('d-1', 'Revenue overview')],
      datasources: [makeDatasource('ds-1')],
      queries: [makeQuery('q-1')],
    });

    visitHome();
    waitForLibraries();

    cy.get('.home-onboarding').should('not.exist');
    cy.get('.home-recent__row').should('have.length', 1);
  });

  it('keeps viewers read-only', () => {
    stubApi({
      role: 'viewer',
      dashboards: [makeDashboard('d-1', 'Shared revenue')],
      datasources: [makeDatasource('ds-1')],
      queries: [makeQuery('q-1')],
    });

    visitHome();
    waitForLibraries();

    cy.get('.home-primary').should('not.exist');
    cy.get('.home-onboarding').should('not.exist');
    cy.get('.home-activity').should('not.exist');
    cy.get('.home-recent__row').should('have.length', 1);
  });

  it('respects a dismissed checklist', () => {
    stubApi();

    visitHome({ dismissed: true });
    waitForLibraries();

    cy.get('.home-onboarding').should('not.exist');
  });

  it('shows a skeleton while the libraries load', () => {
    stubApi({ dashboardDelay: 2000 });

    visitHome();

    cy.get('.home-skeleton').should('exist');
    cy.wait('@dashboards');
    cy.get('.home-summary', { timeout: 20000 }).should('be.visible');
    cy.get('.home-skeleton').should('not.exist');
  });

  it('recovers from a library error with retry', () => {
    stubApi({ failDashboardFirst: true });

    visitHome();
    cy.wait('@dashboards');

    cy.contains('Could not load your workspace').should('be.visible');
    cy.contains('button', 'Try again').click();

    cy.wait('@dashboards');
    cy.wait(['@datasources', '@queries']);
    cy.get('.home-summary', { timeout: 20000 }).should('be.visible');
    cy.get('.ui-error').should('not.exist');
  });

  it('fits a narrow viewport without horizontal overflow', () => {
    stubApi({
      dashboards: [makeDashboard('d-1', 'Revenue overview')],
      datasources: [makeDatasource('ds-1')],
      queries: [makeQuery('q-1')],
    });

    cy.viewport(390, 844);
    visitHome();
    waitForLibraries();

    cy.get('.home-primary').should('be.visible');
    cy.get('.main-content').then(($main) => {
      const main = $main[0];
      expect(main.scrollWidth).to.be.at.most(main.clientWidth + 1);
    });
    cy.document().then((doc) => {
      expect(doc.documentElement.scrollWidth).to.be.at.most(doc.documentElement.clientWidth);
    });
  });

  it('has no critical or serious axe findings', () => {
    stubApi({
      dashboards: [
        makeDashboard('d-1', 'Revenue overview', { widget_count: 4 }),
        makeDashboard('d-2', 'Customer churn'),
      ],
      datasources: [makeDatasource('ds-1')],
      queries: [makeQuery('q-1')],
      events: [makeEvent('e-1', 'dashboard.updated', 'Revenue overview')],
    });

    visitHome();
    waitForLibraries();
    cy.wait('@audit');

    cy.injectAxe();
    cy.checkA11y(undefined, { includedImpacts: ['critical', 'serious'] });
  });

  it('has no critical or serious axe findings in dark theme', () => {
    stubApi({
      dashboards: [
        makeDashboard('d-1', 'Revenue overview', { widget_count: 4 }),
        makeDashboard('d-2', 'Customer churn'),
      ],
      datasources: [makeDatasource('ds-1')],
      queries: [makeQuery('q-1')],
      events: [makeEvent('e-1', 'dashboard.updated', 'Revenue overview')],
    });

    visitHome({ theme: 'dark' });
    waitForLibraries();
    cy.wait('@audit');
    cy.get('html').should('have.attr', 'data-theme', 'dark');

    cy.injectAxe();
    cy.checkA11y(undefined, { includedImpacts: ['critical', 'serious'] });
  });
});
