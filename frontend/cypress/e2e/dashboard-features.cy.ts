/**
 * Feature coverage for the dashboard experience: filters, CSV export,
 * duplicate, and password-protected share links.
 *
 * Fixtures are created through the API in `before` and removed in `after`, so
 * the spec runs against a seeded database without depending on demo data.
 * Deleting a dashboard cascades to its widgets and share links.
 */
const apiUrl = (Cypress.env('apiUrl') as string | undefined) ?? 'http://127.0.0.1:8099/api/v1';
const email = (Cypress.env('demoEmail') as string | undefined) ?? 'admin@acme.com';
const password = (Cypress.env('demoPassword') as string | undefined) ?? 'password123';
const seededDatasourceId = '11111111-1111-1111-1111-111111111111';

const runId = Date.now().toString(36);
const fixtureName = `E2E Fixture ${runId}`;
const sharePassword = 'e2e-secret';

let authToken = '';
let queryId = '';
let dashboardId = '';
let shareToken = '';

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
    { cacheAcrossSpecs: true }
  );
};

describe('dashboard features', () => {
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
            sql_text:
              'SELECT country, COUNT(*) AS customers FROM sample_customers WHERE country = {{country}} GROUP BY country',
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
            filters: [
              { id: 'country', label: 'Country', type: 'text', default: 'US' },
            ],
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
            widget_type: 'table',
            config: {},
            position_x: 0,
            position_y: 0,
            width: 6,
            height: 4,
          },
        });
      })
      .then(() => {
        return cy.request({
          method: 'POST',
          url: `${apiUrl}/dashboards/${dashboardId}/share`,
          headers: authHeaders(),
          body: { password: sharePassword },
        });
      })
      .then((res) => {
        shareToken = res.body.token;
      });
  });

  after(() => {
    if (!authToken) return;
    cy.request({ method: 'GET', url: `${apiUrl}/dashboards`, headers: authHeaders() }).then((res) => {
      const ids = (res.body as Array<{ id: string; name: string }>)
        .filter((d) => d.name === fixtureName || d.name === `${fixtureName} (copy)`)
        .map((d) => d.id);
      ids.forEach((id) => {
        cy.request({
          method: 'DELETE',
          url: `${apiUrl}/dashboards/${id}`,
          headers: authHeaders(),
          failOnStatusCode: false,
        });
      });
    });
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

  it('applies a filter, syncs it to the URL, and restores it on reload', () => {
    cy.visit(`/dashboards/${dashboardId}`);

    cy.get('#filter-country', { timeout: 30000 }).should('have.value', 'US');
    cy.contains('.ag-cell', 'US', { timeout: 30000 }).should('exist');

    cy.get('#filter-country').clear();
    cy.get('#filter-country').type('UK');
    cy.contains('button', 'Apply').click();

    cy.location('search').should('contain', 'f_country=UK');
    cy.contains('.ag-cell', 'UK', { timeout: 30000 }).should('exist');
    cy.contains('.ag-cell', 'US').should('not.exist');

    cy.reload();
    cy.get('#filter-country', { timeout: 30000 }).should('have.value', 'UK');
    cy.contains('.ag-cell', 'UK', { timeout: 30000 }).should('exist');

    cy.contains('button', 'Reset').click();
    cy.location('search').should('not.contain', 'f_country');
    cy.get('#filter-country').should('have.value', 'US');
    cy.contains('.ag-cell', 'US', { timeout: 30000 }).should('exist');
  });

  it('exports a widget as CSV', () => {
    let capturedCsv = '';
    let downloadName = '';

    cy.visit(`/dashboards/${dashboardId}?f_country=US`);
    cy.contains('.ag-cell', 'US', { timeout: 30000 }).should('exist');

    cy.window().then((win) => {
      cy.stub(win.URL, 'createObjectURL')
        .callsFake((blob: Blob) => {
          void blob.text().then((text) => {
            capturedCsv = text;
          });
          return 'blob:mock';
        })
        .as('createObjectURL');
      cy.stub(win.URL, 'revokeObjectURL').as('revokeObjectURL');
      cy.stub(win.HTMLAnchorElement.prototype, 'click')
        .callsFake(function (this: HTMLAnchorElement) {
          downloadName = this.download;
        })
        .as('downloadClick');
    });

    cy.get('.dv-export-btn').first().click();

    cy.get('@createObjectURL').should('have.been.calledOnce');
    cy.get('@downloadClick').should('have.been.calledOnce');
    cy.then(() => {
      expect(downloadName).to.match(/-table-1\.csv$/);
    });
    cy.wrap(null).should(() => {
      expect(capturedCsv).to.contain('country,customers');
      expect(capturedCsv).to.contain('US');
    });
  });

  it('duplicates a dashboard and copies its widgets', () => {
    cy.visit('/dashboards');
    cy.contains('.list-card', fixtureName, { timeout: 30000 }).within(() => {
      cy.contains('button', 'Duplicate').click();
    });

    cy.contains('Dashboard duplicated', { timeout: 30000 }).should('exist');
    cy.contains('.card-title', `${fixtureName} (copy)`, { timeout: 30000 }).should('exist');
  });

  it('requires the password for a protected share link', () => {
    cy.visit(`/view/${shareToken}`);

    cy.contains('h3', 'Password Required', { timeout: 30000 }).should('exist');
    cy.get('input[placeholder="Enter dashboard password"]').type('wrong-password');
    cy.contains('button', 'Submit').click();
    cy.get('.shared-view-error').should('be.visible');

    cy.get('input[placeholder="Enter dashboard password"]').clear();
    cy.get('input[placeholder="Enter dashboard password"]').type(sharePassword);
    cy.contains('button', 'Submit').click();

    cy.contains('h2', fixtureName, { timeout: 30000 }).should('exist');
    cy.get('.shared-view-widget', { timeout: 30000 }).should('have.length.greaterThan', 0);
    cy.contains('.ag-cell', 'US', { timeout: 30000 }).should('exist');
  });
});
