/**
 * Visual regression baselines.
 *
 * Screenshots are compared by `scripts/visual-regression.mjs`. Baselines are
 * stored per platform because font rasterisation differs between macOS,
 * Linux, and Windows. See `frontend/README.md#visual-regression` for how to
 * create or refresh them.
 */
const apiUrl = (Cypress.env('apiUrl') as string | undefined) ?? 'http://127.0.0.1:8099/api/v1';
const email = (Cypress.env('demoEmail') as string | undefined) ?? 'admin@acme.com';
const password = (Cypress.env('demoPassword') as string | undefined) ?? 'password123';

let accessToken = '';
let dashboardId = '';

const stabilize = () => {
  cy.document().then((doc) => {
    if (doc.querySelector('style[data-visual-regression]')) return;
    const style = doc.createElement('style');
    style.setAttribute('data-visual-regression', 'true');
    style.textContent = `
      *, *::before, *::after {
        animation-delay: 0s !important;
        animation-duration: 0s !important;
        transition-duration: 0s !important;
        caret-color: transparent !important;
      }
    `;
    doc.head.appendChild(style);
  });
};

const shot = (name: string) => {
  stabilize();
  cy.screenshot(name, { capture: 'viewport', overwrite: true });
};

describe('visual regression', () => {
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
    cy.viewport(1280, 800);
  });

  it('login', () => {
    cy.clearLocalStorage();
    cy.visit('/login');
    cy.contains('h2', 'Welcome back').should('be.visible');
    shot('login');
  });

  it('register', () => {
    cy.clearLocalStorage();
    cy.visit('/register');
    cy.contains('h2', 'Create an account').should('be.visible');
    shot('register');
  });

  it('settings', () => {
    cy.session('visual-admin', () => {
      window.localStorage.setItem('access_token', accessToken);
      window.localStorage.setItem('refresh_token', 'visual-refresh-placeholder');
    });
    cy.visit('/settings');
    cy.contains('Your settings').should('be.visible');
    shot('settings');
  });

  it('dashboard widget', () => {
    cy.session('visual-admin', () => {
      window.localStorage.setItem('access_token', accessToken);
      window.localStorage.setItem('refresh_token', 'visual-refresh-placeholder');
    });
    cy.visit(`/dashboards/${dashboardId}`);
    cy.get('.dashboard-view-widget canvas', { timeout: 30000 }).should('exist');
    // ECharts animates on first paint with its own canvas clock; let it settle.
    cy.wait(1500);
    stabilize();
    cy.get('.dashboard-view-widget')
      .filter(':has(canvas)')
      .first()
      .screenshot('dashboard-chart', { overwrite: true });
  });
});
