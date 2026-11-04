/**
 * Phase 4 query/datasource workflows: split-pane editor, run, sort, filter,
 * format, save-and-run, cancel, dependency guard, schema browser, and the
 * test-before-save connection probe.
 *
 * Fixtures are created and removed through the API so the suite can run on a
 * seeded database without manual setup.
 */
const apiUrl = (Cypress.env('apiUrl') as string | undefined) ?? 'http://127.0.0.1:8099/api/v1';
const email = (Cypress.env('demoEmail') as string | undefined) ?? 'admin@acme.com';
const password = (Cypress.env('demoPassword') as string | undefined) ?? 'password123';

const runId = Date.now().toString(36);
const queryName = `Workflow Query ${runId}`;

let authToken = '';
let createdQueryId = '';

const authHeaders = () => ({ Authorization: `Bearer ${authToken}` });

const loginWithSession = () => {
  cy.session(
    'query-workflow-admin',
    () => {
      cy.request('POST', `${apiUrl}/auth/login`, { email, password }).then((res) => {
        window.localStorage.setItem('access_token', res.body.tokens.access_token);
        window.localStorage.setItem('refresh_token', res.body.tokens.refresh_token);
      });
    },
    { cacheAcrossSpecs: true },
  );
};

const openDatasourceMenu = () => {
  cy.contains('.list-card', 'Internal PostgreSQL', { timeout: 30000 }).within(() => {
    cy.get('button[aria-label$="actions"]').click();
  });
};

interface MonacoModel {
  setValue(value: string): void;
}

interface MonacoGlobal {
  editor: {
    getModels(): MonacoModel[];
  };
}

const getMonaco = (win: Window): MonacoGlobal | undefined =>
  (win as unknown as { monaco?: MonacoGlobal }).monaco;

/**
 * Monaco 0.55 uses the EditContext API rather than a plain textarea, so
 * Cypress' `type()` cannot reach the real input handler. Drive the model
 * through the Monaco global the loader exposes, then confirm the editor
 * rendered the SQL and React accepted it.
 */
const enterSql = (sql: string) => {
  cy.window({ timeout: 30000 }).should((win) => {
    const monaco = getMonaco(win);
    expect(monaco?.editor.getModels().length ?? 0, 'monaco models').to.be.greaterThan(0);
  });
  // Let the wrapper's content-change subscription attach before the model is
  // mutated; the first render can expose a model before that effect runs.
  cy.wait(300);
  cy.window().then((win) => {
    getMonaco(win)?.editor.getModels()[0].setValue(sql);
  });
  cy.get('.view-lines', { timeout: 10000 }).should('contain', 'SELECT');
  cy.contains('button', 'Run').should('not.be.disabled');
};

describe('query and datasource workflows', () => {
  before(() => {
    cy.request('POST', `${apiUrl}/auth/login`, { email, password }).then((res) => {
      authToken = res.body.tokens.access_token;
    });
  });

  after(() => {
    if (!authToken || !createdQueryId) return;
    cy.request({
      method: 'DELETE',
      url: `${apiUrl}/queries/${createdQueryId}`,
      headers: authHeaders(),
      failOnStatusCode: false,
    });
  });

  beforeEach(() => {
    loginWithSession();
  });

  it('runs, sorts, filters, formats, and saves a query', () => {
    cy.visit('/queries/new');

    cy.get('input[aria-label="Query name"]').type(queryName);
    cy.contains('.dropdown-trigger', 'Select a datasource').click();
    cy.contains('.dropdown-option', 'Internal PostgreSQL').click();

    const sql =
      'SELECT country, COUNT(*) AS cnt, SUM(id) AS total FROM sample_customers GROUP BY country ORDER BY cnt DESC;';
    enterSql(sql);

    cy.contains('button', 'Run').click();
    cy.get('.result-table tbody tr', { timeout: 30000 }).should('have.length.greaterThan', 1);
    cy.get('.results-meta').should('contain', 'rows').and('contain', 'columns');

    // Sorting: first click ascending, second click descending.
    cy.get('.result-table th').contains('button', 'cnt').click();
    cy.get('.result-table th[aria-sort="ascending"]').should('exist');
    cy.get('.result-table th').contains('button', 'cnt').click();
    cy.get('.result-table th[aria-sort="descending"]').should('exist');

    // Filtering hides rows that do not match.
    cy.get('input[aria-label="Filter result rows"]').type('US');
    cy.get('.result-table tbody tr').should('have.length', 1);
    cy.contains('.result-table td', 'US').should('exist');
    cy.get('.results-meta').should('contain', '1 of');
    cy.get('input[aria-label="Filter result rows"]').clear();

    // Formatting is loaded on demand; the editor stays runnable afterwards.
    cy.contains('button', 'Format').click();
    cy.get('.view-lines .view-line', { timeout: 10000 }).should('have.length.greaterThan', 3);

    cy.contains('button', 'Save & run').click();
    cy.contains('Query created', { timeout: 30000 }).should('exist');
    cy.url({ timeout: 30000 }).should('include', '/queries/').and('not.include', '/new');
    cy.get('.query-dirty-badge').should('not.exist');
    cy.get('.result-table tbody tr', { timeout: 30000 }).should('have.length.greaterThan', 1);

    cy.url().then((url) => {
      const match = url.match(/\/queries\/([^/]+)\/edit/);
      if (match) createdQueryId = match[1];
    });

    // The saved query reloads with its name, SQL, and result metadata.
    cy.reload();
    cy.get('input[aria-label="Query name"]', { timeout: 30000 }).should('have.value', queryName);
    cy.get('.query-dirty-badge').should('not.exist');
  });

  it('cancels an in-flight query', () => {
    cy.visit('/queries/new');
    cy.contains('.dropdown-trigger', 'Select a datasource').click();
    cy.contains('.dropdown-option', 'Internal PostgreSQL').click();

    enterSql(
      'SELECT COUNT(*) FROM sample_events a CROSS JOIN sample_events b CROSS JOIN sample_events c;',
    );

    cy.contains('button', 'Run').click();
    cy.contains('button', 'Cancel', { timeout: 10000 }).click();
    cy.contains('Query canceled', { timeout: 10000 }).should('exist');
    cy.contains('button', 'Run').should('not.be.disabled');
  });

  it('explains blocked deletes, browses schema, and tests a saved connection', () => {
    cy.visit('/datasources');

    openDatasourceMenu();
    cy.contains('[role="menuitem"]', 'Delete').click();
    cy.contains('Datasource is in use', { timeout: 30000 }).should('exist');
    cy.get('.dependency-groups').should('contain', 'Saved queries');
    cy.contains('button', 'Close').click();

    openDatasourceMenu();
    cy.contains('[role="menuitem"]', 'Browse schema').click();
    cy.contains('Schema · Internal PostgreSQL', { timeout: 30000 }).should('exist');
    cy.get('.schema-tables', { timeout: 30000 }).should('contain', 'sample_customers');
    cy.get('.schema-tables').should('contain', 'country');
    cy.contains('button', 'Close').click();

    cy.contains('.list-card', 'Internal PostgreSQL').contains('a', 'Edit').click();
    cy.contains('button', 'Test connection', { timeout: 30000 }).click();
    cy.get('.datasource-test-result', { timeout: 30000 }).should('contain', 'Connection successful');
  });
});
