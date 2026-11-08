/**
 * Signed-in shell behaviour: header, navigation rail, and mobile drawer.
 *
 * Every request is intercepted so the spec runs without the seeded API.
 */
const ORG_ID = 'org-shell';

const USER = {
  id: 'user-1',
  org_id: ORG_ID,
  email: 'admin@acme.com',
  role: 'admin',
  created_at: '2026-01-01T00:00:00Z',
};

const DASHBOARDS = [
  {
    id: 'd-1',
    org_id: ORG_ID,
    name: 'Revenue overview',
    description: '',
    tags: [],
    refresh_interval_seconds: 0,
    is_favorite: true,
    widget_count: 2,
    created_by: 'user-1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-03-01T00:00:00Z',
  },
];

const DATASOURCES = [
  {
    id: 'ds-1',
    org_id: ORG_ID,
    name: 'Warehouse',
    type: 'postgres',
    host: 'db.internal',
    port: 5432,
    db_name: 'analytics',
    username: 'reader',
    ssl_mode: 'require',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

const QUERIES = [
  {
    id: 'q-1',
    org_id: ORG_ID,
    datasource_id: 'ds-1',
    name: 'Monthly revenue',
    sql_text: 'select 1',
    max_rows: 1000,
    timeout_ms: 5000,
    created_by: 'user-1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

const formatViolations = (
  violations: { id: string; impact?: string | null; help: string; nodes: { target: string[]; failureSummary?: string }[] }[],
) =>
  violations
    .map((violation) =>
      [
        `${violation.id} (${violation.impact}): ${violation.help}`,
        ...violation.nodes.map(
          (node) => `  ${node.target.join(' ')} :: ${node.failureSummary ?? ''}`,
        ),
      ].join('\n'),
    )
    .join('\n\n');

const scan = () => {
  cy.injectAxe();
  cy.checkA11y(
    undefined,
    { includedImpacts: ['critical', 'serious'], retries: 2, interval: 200 },
    (violations) => {
      if (violations.length > 0) throw new Error(formatViolations(violations));
    },
    true,
  );
};

const stubApi = () => {
  cy.intercept('GET', '**/api/v1/me', { body: USER }).as('me');
  cy.intercept('GET', '**/api/v1/dashboards', { body: DASHBOARDS }).as('dashboards');
  cy.intercept('GET', '**/api/v1/datasources', { body: DATASOURCES }).as('datasources');
  cy.intercept('GET', '**/api/v1/queries', { body: QUERIES }).as('queries');
  cy.intercept('GET', '**/api/v1/team/audit*', { body: { events: [] } }).as('audit');
  cy.intercept('GET', '**/api/v1/me/settings', {
    body: { display_name: '', timezone: 'UTC' },
  }).as('settings');
  cy.intercept('GET', '**/api/v1/team/members', { body: { members: [] } }).as('members');
  cy.intercept('GET', '**/api/v1/team/invites', { body: { invites: [] } }).as('invites');
};

const visitApp = (path = '/', theme: 'light' | 'dark' = 'light') => {
  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.setItem('access_token', 'shell-access-token');
      win.localStorage.setItem('refresh_token', 'shell-refresh-token');
      win.localStorage.setItem('dashboard-builder-theme', theme);
      win.localStorage.removeItem('dashboard-builder-sidebar-collapsed');
    },
  });
  cy.wait('@me');
  cy.get('.topbar', { timeout: 20000 }).should('be.visible');
};

describe('application shell — desktop', () => {
  beforeEach(() => {
    cy.viewport(1280, 800);
    stubApi();
    visitApp();
  });

  it('renders grouped navigation and a 64px header', () => {
    cy.get('.topbar').should('have.css', 'height', '64px');
    cy.get('#app-sidebar').should('have.css', 'width', '240px');
    cy.get('.main-wrapper').should('have.css', 'margin-left', '240px');

    cy.get('.sidebar-group').should('have.length', 2);
    cy.get('.sidebar-group').eq(0).find('a').should('have.length', 4);
    cy.get('.sidebar-group').eq(1).find('a').should('have.length', 2);
    cy.contains('.sidebar-group a', 'Home').should('have.attr', 'aria-current', 'page');
  });

  it('collapses to 64px and labels icon-only items', () => {
    cy.get('.sidebar-collapse-btn').click();

    cy.get('#app-sidebar').should('have.css', 'width', '64px');
    cy.get('.main-wrapper').should('have.css', 'margin-left', '64px');
    cy.get('.sidebar').should('have.class', 'sidebar--collapsed');
    cy.contains('.sidebar-group a', 'Home')
      .find('.nav-label')
      .should('have.css', 'opacity', '0');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('dashboard-builder-sidebar-collapsed')).to.eq('1');
    });
  });

  it('restores the collapsed rail after a reload', () => {
    cy.get('.sidebar-collapse-btn').click();
    cy.get('#app-sidebar').should('have.css', 'width', '64px');

    cy.reload();
    cy.wait('@me');
    cy.get('#app-sidebar').should('have.css', 'width', '64px');
    cy.get('.main-wrapper').should('have.css', 'margin-left', '64px');
  });

  it('moves the active state and breadcrumb to Settings', () => {
    cy.contains('.sidebar-group a', 'Settings').click();

    cy.location('pathname').should('eq', '/settings');
    cy.get('.breadcrumbs__current').should('have.text', 'Settings');
    cy.contains('.sidebar-group a', 'Settings').should('have.attr', 'aria-current', 'page');
  });

  it('puts identity in the account menu and removes the duplicate theme action', () => {
    cy.get('.topbar__avatar').click();

    cy.get('.ui-menu__header').should('contain', 'admin@acme.com').and('contain', 'Admin');
    cy.get('.ui-menu__item').should('have.length', 3);
    cy.contains('.ui-menu__item', 'Settings').should('be.visible');
    cy.contains('.ui-menu__item', 'Sign out').should('be.visible');
    cy.get('.ui-menu').should('not.contain', 'Switch to');
  });

  it('keeps the palette named and navigable by keyboard', () => {
    cy.get('.topbar__palette')
      .invoke('attr', 'aria-label')
      .should('contain', 'Search or jump to…');
    cy.get('.topbar__palette').click();

    cy.get('.ui-command').should('be.visible');
    cy.get('.ui-command__input').should('have.focus').and('have.attr', 'role', 'combobox');

    cy.get('.ui-command__input').type('settings');
    cy.get('.ui-command__input').should('have.attr', 'aria-activedescendant');
    cy.get('.ui-command__input').type('{esc}');
    cy.get('.ui-command').should('not.exist');
  });

  it('opens the palette with Ctrl+K outside the editor', () => {
    cy.window().then((win) => {
      win.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
    });
    cy.get('.ui-command').should('be.visible');
    cy.get('.ui-command__input').type('{esc}');
    cy.get('.ui-command').should('not.exist');
  });

  it('toggles the theme from the header', () => {
    cy.get('[aria-label="Switch to dark theme"]').click();
    cy.get('html').should('have.attr', 'data-theme', 'dark');
  });

  it('passes axe in light, dark, and palette states', () => {
    scan();

    cy.get('[aria-label="Switch to dark theme"]').click();
    scan();

    cy.get('.topbar__palette').click();
    scan();
  });
});

describe('application shell — mobile', () => {
  beforeEach(() => {
    cy.viewport(390, 844);
    stubApi();
    visitApp();
  });

  it('removes the closed drawer from focus and returns focus on Escape', () => {
    cy.get('#app-sidebar').should('have.css', 'visibility', 'hidden');
    cy.get('.topbar__menu-btn')
      .should('have.attr', 'aria-label', 'Open navigation')
      .and('have.attr', 'aria-expanded', 'false');

    cy.get('.topbar__menu-btn').click();
    cy.get('#app-sidebar').should('have.css', 'visibility', 'visible');
    cy.get('.topbar__menu-btn').should('have.attr', 'aria-expanded', 'true');
    cy.get('.sidebar-mobile-close').should('have.focus');
    cy.get('.main-wrapper').should('have.attr', 'inert');

    cy.get('body').trigger('keydown', { key: 'Escape', force: true });
    cy.get('#app-sidebar').should('have.css', 'visibility', 'hidden');
    cy.get('.topbar__menu-btn').should('have.focus').and('have.attr', 'aria-expanded', 'false');
    cy.get('.main-wrapper').should('not.have.attr', 'inert');
  });

  it('closes the drawer after navigation', () => {
    cy.get('.topbar__menu-btn').click();
    cy.get('.sidebar-mobile-close').should('have.focus');
    cy.contains('.sidebar-group a', 'Settings').click();

    cy.location('pathname').should('eq', '/settings');
    cy.get('#app-sidebar').should('have.css', 'visibility', 'hidden');
  });

  it('keeps the palette trigger accessible when its label is hidden', () => {
    cy.get('.topbar__palette-label').should('not.be.visible');
    cy.get('.topbar__palette')
      .invoke('attr', 'aria-label')
      .should('contain', 'Search or jump to…');
    cy.get('.topbar__palette').click();
    cy.get('.ui-command').should('be.visible');
  });

  it('passes axe with the drawer closed and open', () => {
    scan();

    cy.get('.topbar__menu-btn').click();
    cy.get('#app-sidebar').should('have.css', 'visibility', 'visible');
    scan();
  });
});
