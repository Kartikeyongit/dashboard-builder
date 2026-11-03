/**
 * Phase 2 builder coverage: edit a widget in the inspector, duplicate it,
 * delete it with undo, and set a per-widget refresh override.
 *
 * The fixture dashboard is created through the API and removed afterwards, so
 * the spec does not depend on demo dashboards.
 */
const apiUrl = (Cypress.env('apiUrl') as string | undefined) ?? 'http://127.0.0.1:8099/api/v1';
const email = (Cypress.env('demoEmail') as string | undefined) ?? 'admin@acme.com';
const password = (Cypress.env('demoPassword') as string | undefined) ?? 'password123';
const seededDatasourceId = '11111111-1111-1111-1111-111111111111';

const runId = Date.now().toString(36);
const fixtureName = `Builder Fixture ${runId}`;

let authToken = '';
let queryId = '';
let dashboardId = '';

const authHeaders = () => ({ Authorization: `Bearer ${authToken}` });

const loginWithSession = () => {
  cy.session(
    'e2e-admin',
    () => {
      cy.request('POST', `${apiUrl}/auth/login`, { email, password }).then((res) => {
        window.localStorage.setItem('access_token', res.body.tokens.access_token);
        window.localStorage.setItem('refresh_token', res.body.tokens.refresh_token);
      });
    },
    { cacheAcrossSpecs: true },
  );
};

const openWidgetMenu = (title: string) => {
  cy.get(`button[aria-label="${title} actions"]`).click();
};

const openInspector = (title: string) => {
  openWidgetMenu(title);
  cy.contains('.ui-menu__item', 'Edit widget').click();
  cy.get('.widget-inspector', { timeout: 30000 }).should('exist');
};

const field = (label: string) => cy.contains('.widget-inspector .ui-field', label);

describe('dashboard builder', () => {
  before(() => {
    cy.request('POST', `${apiUrl}/auth/login`, { email, password })
      .then((res) => {
        authToken = res.body.tokens.access_token;
        return cy.request({
          method: 'POST',
          url: `${apiUrl}/queries`,
          headers: authHeaders(),
          body: {
            datasource_id: seededDatasourceId,
            name: `${fixtureName} query`,
            sql_text: 'SELECT country, COUNT(*) AS customers FROM sample_customers GROUP BY country',
            max_rows: 100,
            timeout_ms: 10000,
          },
        });
      })
      .then((res) => {
        queryId = res.body.id;
        return cy.request({
          method: 'POST',
          url: `${apiUrl}/dashboards`,
          headers: authHeaders(),
          body: {
            name: fixtureName,
            refresh_interval_seconds: 0,
            filters: [],
          },
        });
      })
      .then((res) => {
        dashboardId = res.body.id;
        return cy.request({
          method: 'POST',
          url: `${apiUrl}/dashboards/${dashboardId}/widgets`,
          headers: authHeaders(),
          body: {
            query_id: queryId,
            widget_type: 'chart',
            config: { chartType: 'bar' },
            position_x: 0,
            position_y: 0,
            width: 6,
            height: 4,
          },
        });
      });
  });

  after(() => {
    if (!authToken) return;
    if (dashboardId) {
      cy.request({
        method: 'DELETE',
        url: `${apiUrl}/dashboards/${dashboardId}`,
        headers: authHeaders(),
        failOnStatusCode: false,
      });
    }
    if (queryId) {
      cy.request({
        method: 'DELETE',
        url: `${apiUrl}/queries/${queryId}`,
        headers: authHeaders(),
        failOnStatusCode: false,
      });
    }
  });

  beforeEach(() => {
    loginWithSession();
  });

  it('edits a widget title and chart type in the inspector', () => {
    cy.visit(`/dashboards/${dashboardId}/edit`);
    cy.contains('.widget-header-title', 'Chart', { timeout: 30000 }).should('exist');

    openInspector('Chart');
    field('Title').find('input').clear().type('Revenue insight');
    field('Chart type').find('select').select('line');
    cy.contains('.widget-inspector button', 'Save changes').click();

    cy.contains('Widget updated', { timeout: 30000 }).should('exist');
    cy.contains('.widget-header-title', 'Revenue insight').should('exist');

    // The change is persisted, not just held in Redux.
    cy.reload();
    cy.contains('.widget-header-title', 'Revenue insight', { timeout: 30000 }).should('exist');
  });

  it('duplicates a widget with a copied title and config', () => {
    cy.visit(`/dashboards/${dashboardId}/edit`);
    cy.get('.widget-box', { timeout: 30000 }).should('have.length', 1);

    openWidgetMenu('Revenue insight');
    cy.contains('.ui-menu__item', 'Duplicate').click();

    cy.contains('Widget duplicated', { timeout: 30000 }).should('exist');
    cy.get('.widget-box', { timeout: 30000 }).should('have.length', 2);
    cy.contains('.widget-header-title', 'Revenue insight (copy)').should('exist');
  });

  it('deletes a widget immediately and restores it with Undo', () => {
    cy.visit(`/dashboards/${dashboardId}/edit`);
    cy.get('.widget-box', { timeout: 30000 }).should('have.length', 2);

    openWidgetMenu('Revenue insight (copy)');
    cy.contains('.ui-menu__item', 'Delete widget').click();

    cy.contains('Widget deleted', { timeout: 30000 }).should('exist');
    cy.get('.widget-box').should('have.length', 1);
    cy.contains('.widget-header-title', 'Revenue insight (copy)').should('not.exist');

    cy.contains('.toast-action', 'Undo').click();
    cy.get('.widget-box', { timeout: 30000 }).should('have.length', 2);
    cy.contains('.widget-header-title', 'Revenue insight (copy)').should('exist');
  });

  it('sets a per-widget refresh override and shows it in the editor', () => {
    cy.visit(`/dashboards/${dashboardId}/edit`);
    openInspector('Revenue insight');

    field('Widget refresh').find('select').select('custom');
    field('Seconds').find('input').clear().type('30');
    cy.contains('.widget-inspector button', 'Save changes').click();

    cy.contains('Widget updated', { timeout: 30000 }).should('exist');
    cy.get('button[aria-label="Revenue insight actions"]')
      .parents('.widget-box')
      .find('.widget-refresh-badge')
      .should('contain', '30s');

    cy.request({
      method: 'GET',
      url: `${apiUrl}/dashboards/${dashboardId}/full`,
      headers: authHeaders(),
    }).then((res) => {
      const widget = (res.body.widgets as Array<{ widget: { config: { title?: string }; refresh_interval_override?: number } }>)
        .map((item) => item.widget)
        .find((item) => item.config?.title === 'Revenue insight');
      expect(widget, 'edited widget').to.not.equal(undefined);
      expect(widget?.refresh_interval_override).to.equal(30);
    });
  });
});
