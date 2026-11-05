/**
 * Phase 5 accessibility gate.
 *
 * Every key page is scanned with axe-core. Only critical and serious findings
 * fail the run: those are the ones that block assistive technology. Minor and
 * best-practice hints are logged in the browser console by cypress-axe so they
 * can be triaged without turning CI red for cosmetic rules.
 */
const apiUrl = (Cypress.env('apiUrl') as string | undefined) ?? 'http://127.0.0.1:8099/api/v1';
const email = (Cypress.env('demoEmail') as string | undefined) ?? 'admin@acme.com';
const password = (Cypress.env('demoPassword') as string | undefined) ?? 'password123';

let accessToken = '';
let dashboardId = '';

const formatViolations = (violations: { id: string; impact?: string | null; help: string; nodes: { target: string[]; failureSummary?: string }[] }[]) =>
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
    {
      includedImpacts: ['critical', 'serious'],
      // Radix renders overlays in a portal; scan the whole document so focus
      // traps and dialogs are included.
      retries: 2,
      interval: 200,
    },
    (violations) => {
      if (violations.length > 0) {
        throw new Error(formatViolations(violations));
      }
    },
    true,
  );
};

const visitAndScan = (path: string, ready?: () => void) => {
  cy.visit(path);
  ready?.();
  scan();
};

describe('accessibility', () => {
  before(() => {
    cy.request('POST', `${apiUrl}/auth/login`, { email, password }).then((res) => {
      accessToken = res.body.tokens.access_token;
      cy.request({
        url: `${apiUrl}/dashboards`,
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then((dashboards) => {
        const list = dashboards.body as { id: string; name: string }[];
        const sales = list.find((dashboard) => dashboard.name === 'Sales Overview');
        dashboardId = (sales ?? list[0]).id;
      });
    });
  });

  beforeEach(() => {
    cy.session(
      'a11y-admin',
      () => {
        window.localStorage.setItem('access_token', accessToken);
        window.localStorage.setItem('refresh_token', 'a11y-refresh-placeholder');
      },
      { cacheAcrossSpecs: true },
    );
  });

  describe('public pages', () => {
    // Clear the cached session for the two anonymous routes.
    beforeEach(() => {
      cy.clearLocalStorage();
    });

    it('login', () => {
      visitAndScan('/login', () => cy.contains('h2', 'Welcome back').should('be.visible'));
    });

    it('register', () => {
      visitAndScan('/register', () => cy.contains('h2', 'Create an account').should('be.visible'));
    });
  });

  describe('authenticated pages', () => {
    it('home', () => {
      visitAndScan('/', () => cy.contains('.welcome-greeting', 'Welcome back').should('be.visible'));
    });

    it('datasources', () => {
      visitAndScan('/datasources', () => cy.contains('Internal PostgreSQL').should('exist'));
    });

    it('queries', () => {
      visitAndScan('/queries', () => cy.contains('Saved SQL').should('be.visible'));
    });

    it('dashboards', () => {
      visitAndScan('/dashboards', () => cy.contains('Sales Overview').should('exist'));
    });

    it('dashboard viewer', () => {
      visitAndScan(`/dashboards/${dashboardId}`, () => {
        cy.get('.dashboard-view-widget', { timeout: 30000 }).should('have.length.greaterThan', 0);
      });
    });

    it('dashboard editor', () => {
      visitAndScan(`/dashboards/${dashboardId}/edit`, () => {
        cy.get('.react-grid-layout', { timeout: 30000 }).should('exist');
      });
    });

    it('home (dark theme)', () => {
      cy.window().then((win) => win.localStorage.setItem('dashboard-builder-theme', 'dark'));
      visitAndScan('/', () => cy.contains('.welcome-greeting', 'Welcome back').should('be.visible'));
      cy.get('html').should('have.attr', 'data-theme', 'dark');
    });

    it('dashboard viewer (dark theme)', () => {
      cy.window().then((win) => win.localStorage.setItem('dashboard-builder-theme', 'dark'));
      visitAndScan(`/dashboards/${dashboardId}`, () => {
        cy.get('.dashboard-view-widget', { timeout: 30000 }).should('have.length.greaterThan', 0);
      });
      cy.get('html').should('have.attr', 'data-theme', 'dark');
    });

    it('team', () => {
      visitAndScan('/team', () => cy.contains('People & access').should('be.visible'));
    });

    it('settings', () => {
      visitAndScan('/settings', () => cy.contains('Your settings').should('be.visible'));
    });
  });
});
