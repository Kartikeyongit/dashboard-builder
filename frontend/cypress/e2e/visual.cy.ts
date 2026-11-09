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

/**
 * Home screenshots are fully hermetic: the fixture timestamps and the frozen
 * clock make relative-time labels identical on every run.
 */
const HOME_NOW = new Date('2026-03-10T12:00:00Z').getTime();
const homeUser = {
  id: 'user-1',
  org_id: 'org-home',
  email: 'admin@acme.com',
  role: 'admin',
  created_at: '2026-01-01T00:00:00Z',
};
const homeDashboard = (id: string, name: string, updated: string, extra = {}) => ({
  id,
  org_id: 'org-home',
  name,
  description: '',
  tags: [],
  refresh_interval_seconds: 0,
  is_favorite: false,
  widget_count: 2,
  created_by: 'user-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: updated,
  ...extra,
});

const seedHome = () => {
  cy.intercept('GET', '**/api/v1/me', { body: homeUser }).as('home-me');
  cy.intercept('GET', '**/api/v1/dashboards', {
    body: [
      homeDashboard('d-1', 'Revenue overview', '2026-03-10T11:00:00Z', { widget_count: 4 }),
      homeDashboard('d-2', 'Customer churn', '2026-03-10T09:00:00Z'),
      homeDashboard('d-3', 'Ops health', '2026-03-09T12:00:00Z', { is_favorite: true }),
      homeDashboard('d-4', 'Marketing funnel', '2026-03-08T12:00:00Z'),
    ],
  }).as('home-dashboards');
  cy.intercept('GET', '**/api/v1/datasources', {
    body: [
      {
        id: 'ds-1',
        org_id: 'org-home',
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
    ],
  }).as('home-datasources');
  cy.intercept('GET', '**/api/v1/queries', { body: [] }).as('home-queries');
  cy.intercept('GET', '**/api/v1/team/audit*', {
    body: {
      events: [
        {
          id: 'e-1',
          org_id: 'org-home',
          actor_email: 'admin@acme.com',
          action: 'dashboard.updated',
          target_type: 'dashboard',
          target_name: 'Revenue overview',
          metadata: {},
          created_at: '2026-03-10T10:30:00Z',
        },
        {
          id: 'e-2',
          org_id: 'org-home',
          actor_email: 'editor@acme.com',
          action: 'share.created',
          target_type: 'share',
          target_name: 'Sales share link',
          metadata: {},
          created_at: '2026-03-10T08:00:00Z',
        },
        {
          id: 'e-3',
          org_id: 'org-home',
          actor_email: 'admin@acme.com',
          action: 'member.invited',
          target_type: 'invite',
          target_name: 'analyst@acme.com',
          metadata: {},
          created_at: '2026-03-09T16:00:00Z',
        },
      ],
    },
  }).as('home-audit');
};

const visitHome = (theme: 'light' | 'dark' = 'light') => {
  cy.clock(HOME_NOW);
  cy.visit('/', {
    onBeforeLoad(win) {
      win.localStorage.setItem('access_token', 'visual-access-token');
      win.localStorage.setItem('refresh_token', 'visual-refresh-token');
      win.localStorage.setItem('dashboard-builder-theme', theme);
      win.localStorage.removeItem('dashboard-builder-onboarding-dismissed');
    },
  });
  cy.wait('@home-me');
  cy.wait(['@home-dashboards', '@home-datasources', '@home-queries']);
  cy.get('.home-recent__row', { timeout: 20000 }).should('have.length', 4);
  cy.wait('@home-audit');
  cy.get('.home-activity__item', { timeout: 20000 }).should('exist');
  stabilize();
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
    cy.contains('h1', 'Welcome back', { timeout: 20000 }).should('be.visible');
    shot('login');
  });

  it('register', () => {
    cy.clearLocalStorage();
    visit('/register');
    cy.contains('h1', 'Create an account', { timeout: 20000 }).should('be.visible');
    shot('register');
  });

  it('login (dark theme)', () => {
    cy.clearLocalStorage();
    cy.visit('/login', {
      onBeforeLoad(win) {
        win.localStorage.setItem('dashboard-builder-theme', 'dark');
      },
    });
    cy.contains('h1', 'Welcome back', { timeout: 20000 }).should('be.visible');
    shot('login-dark');
  });

  it('login (mobile)', () => {
    cy.viewport(390, 844);
    cy.clearLocalStorage();
    visit('/login');
    cy.contains('h1', 'Welcome back', { timeout: 20000 }).should('be.visible');
    shot('login-mobile');
  });

  it('register (mobile)', () => {
    cy.viewport(390, 844);
    cy.clearLocalStorage();
    visit('/register');
    cy.contains('h1', 'Create an account', { timeout: 20000 }).should('be.visible');
    shot('register-mobile');
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

  // Hermetic: no API or seeded database is needed for these two shots.
  it('home', () => {
    seedHome();
    visitHome('light');
    shot('home');
  });

  it('home (dark theme)', () => {
    seedHome();
    visitHome('dark');
    shot('home-dark');
  });

  it('home (mobile)', () => {
    cy.viewport(390, 844);
    seedHome();
    visitHome('light');
    shot('home-mobile');
  });

  // Only these two surfaces need the API; keeping the login here lets the
  // public screenshots run against a static preview on their own.
  describe('authenticated surfaces', () => {
    before(function () {
      if (Cypress.env('visualHomeOnly')) {
        this.skip();
        return;
      }
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
