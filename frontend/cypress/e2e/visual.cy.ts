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
let refreshToken = '';
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
      /* Landing anchors scroll smoothly; screenshots must not capture mid-scroll. */
      html { scroll-behavior: auto !important; }
    `;
    doc.head.appendChild(style);
  });
};

/**
 * Screenshots must not depend on the host's system theme. Pin light mode
 * before every visit and seed a real token pair so the auth interceptor never
 * tries to refresh a placeholder.
 */
const visit = (path: string) => {
  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.setItem('dashboard-builder-theme', 'light');
    },
  });
};

const shot = (name: string) => {
  stabilize();
  cy.screenshot(name, { capture: 'viewport', overwrite: true });
};

const login = (attempt = 0): void => {
  cy.request({
    method: 'POST',
    url: `${apiUrl}/auth/login`,
    body: { email, password },
    // The suite is rate-limited per IP (10 credential requests/minute). If a
    // previous spec just consumed the window, wait it out instead of failing.
    failOnStatusCode: false,
  }).then((res) => {
    if (res.status === 429 && attempt < 2) {
      cy.wait(20000);
      login(attempt + 1);
      return;
    }
    expect(res.status, 'admin login').to.eq(200);
    accessToken = res.body.tokens.access_token;
    refreshToken = res.body.tokens.refresh_token;
    cy.request({
      url: `${apiUrl}/dashboards`,
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then((dashboards) => {
      const list = dashboards.body as { id: string; name: string }[];
      const sales = list.find((dashboard) => dashboard.name === 'Sales Overview');
      dashboardId = (sales ?? list[0]).id;
    });
  });
};

describe('visual regression', () => {
  beforeEach(() => {
    cy.viewport(1280, 800);
  });

  it('login', () => {
    cy.clearLocalStorage();
    visit('/login');
    cy.contains('h2', 'Welcome back', { timeout: 20000 }).should('be.visible');
    shot('login');
  });

  it('register', () => {
    cy.clearLocalStorage();
    visit('/register');
    cy.contains('h2', 'Create an account', { timeout: 20000 }).should('be.visible');
    shot('register');
  });

  it('landing', () => {
    cy.clearLocalStorage();
    visit('/');
    cy.contains('h1', /live dashboard/i, { timeout: 20000 }).should('be.visible');
    shot('landing');
  });

  it('landing (dark theme)', () => {
    cy.clearLocalStorage();
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.setItem('dashboard-builder-theme', 'dark');
      },
    });
    cy.contains('h1', /live dashboard/i, { timeout: 20000 }).should('be.visible');
    shot('landing-dark');
  });

  it('landing (mobile)', () => {
    cy.viewport(390, 844);
    cy.clearLocalStorage();
    visit('/');
    cy.contains('h1', /live dashboard/i, { timeout: 20000 }).should('be.visible');
    shot('landing-mobile');
  });

  it('landing (FAQ open)', () => {
    cy.clearLocalStorage();
    visit('/');
    cy.contains('h1', /live dashboard/i, { timeout: 20000 }).should('be.visible');
    // Freeze smooth scrolling before any programmatic scroll so the capture
    // cannot land mid-animation on a slower machine.
    stabilize();
    cy.get('#faq-question-1').click();
    cy.get('#faq-answer-1').should('be.visible');
    cy.get('#faq').scrollIntoView();
    cy.wait(400);
    shot('landing-faq');
  });

  // Only these two surfaces need the API; keeping the login here lets the
  // public screenshots run against a static preview on their own.
  describe('authenticated surfaces', () => {
    before(() => {
      login();
    });

    it('settings', () => {
      cy.session('visual-admin', () => {
        window.localStorage.setItem('access_token', accessToken);
        window.localStorage.setItem('refresh_token', refreshToken);
      });
      visit('/settings');
      cy.contains('Your settings', { timeout: 20000 }).should('be.visible');
      shot('settings');
    });

    it('dashboard widget', () => {
      cy.session('visual-admin', () => {
        window.localStorage.setItem('access_token', accessToken);
        window.localStorage.setItem('refresh_token', refreshToken);
      });
      visit(`/dashboards/${dashboardId}`);
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
});
