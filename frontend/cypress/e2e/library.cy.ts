/**
 * Library coverage: search, rename, favorites, settings, command palette, and
 * delete-with-undo. Fixtures are created and removed through the API.
 */
const apiUrl = (Cypress.env('apiUrl') as string | undefined) ?? 'http://127.0.0.1:8099/api/v1';
const email = (Cypress.env('demoEmail') as string | undefined) ?? 'admin@acme.com';
const password = (Cypress.env('demoPassword') as string | undefined) ?? 'password123';

const runId = Date.now().toString(36);
const originalName = `Library Fixture ${runId}`;
const renamedName = `Library Renamed ${runId}`;

let authToken = '';
let dashboardId = '';

const authHeaders = () => ({ Authorization: `Bearer ${authToken}` });

const loginWithSession = () => {
  cy.session(
    'library-admin',
    () => {
      cy.request('POST', `${apiUrl}/auth/login`, { email, password }).then((res) => {
        window.localStorage.setItem('access_token', res.body.tokens.access_token);
        window.localStorage.setItem('refresh_token', res.body.tokens.refresh_token);
      });
    },
    { cacheAcrossSpecs: true }
  );
};

const openCardMenu = (name: string) => {
  cy.contains('.list-card', name, { timeout: 30000 }).within(() => {
    cy.get('button[aria-label$="actions"]').click();
  });
};

describe('dashboard library', () => {
  before(() => {
    cy.request('POST', `${apiUrl}/auth/login`, { email, password }).then((res) => {
      authToken = res.body.tokens.access_token;
      return cy.request({
        method: 'POST',
        url: `${apiUrl}/dashboards`,
        headers: authHeaders(),
        body: {
          name: originalName,
          description: 'Initial description',
          tags: ['e2e'],
          refresh_interval_seconds: 0,
        },
      });
    }).then((res) => {
      dashboardId = res.body.id;
    });
  });

  after(() => {
    if (!authToken || !dashboardId) return;
    cy.request({
      method: 'DELETE',
      url: `${apiUrl}/dashboards/${dashboardId}`,
      headers: authHeaders(),
      failOnStatusCode: false,
    });
  });

  beforeEach(() => {
    loginWithSession();
  });

  it('searches, renames, pins, edits settings, and undoes a delete', () => {
    cy.visit('/dashboards');

    // Search and the empty state.
    cy.get('.ui-list-toolbar__input').type(originalName);
    cy.contains('.dashboard-card__title', originalName, { timeout: 30000 }).should('exist');
    cy.get('.ui-list-toolbar__count').should('contain', '1 of');

    cy.get('.ui-list-toolbar__input').clear().type('zzz-no-match');
    cy.contains('No matching dashboards').should('exist');
    cy.get('.ui-list-toolbar__clear').click();
    cy.contains('.dashboard-card__title', originalName).should('exist');

    // Rename from the card menu.
    openCardMenu(originalName);
    cy.contains('.ui-menu__item', 'Rename').click();
    cy.get('.ui-dialog input').clear().type(renamedName);
    cy.contains('.ui-dialog button', 'Save').click();
    cy.contains('.dashboard-card__title', renamedName, { timeout: 30000 }).should('exist');

    // Pin, filter to pinned, then unpin.
    cy.contains('.list-card', renamedName).within(() => {
      cy.get('button[aria-label^="Pin"]').click();
    });
    cy.contains('.list-card', renamedName).find('button[aria-label^="Unpin"]').should('exist');

    cy.contains('button', 'Pinned').click();
    cy.contains('.dashboard-card__title', renamedName).should('exist');
    cy.contains('button', 'Pinned').click();

    // Settings dialog updates description, tags, and refresh.
    openCardMenu(renamedName);
    cy.contains('.ui-menu__item', 'Settings').click();
    cy.get('.dashboard-settings textarea').clear().type('Updated description');
    cy.get('.dashboard-settings input').eq(1).clear().type('sales, e2e');
    cy.get('.dashboard-settings select').select('Every 5 minutes');
    cy.contains('.ui-dialog button', 'Save changes').click();

    cy.contains('.list-card', renamedName, { timeout: 30000 }).within(() => {
      cy.contains('Updated description').should('exist');
      cy.contains('sales').should('exist');
      // Saving settings must not clear the pin.
      cy.get('button[aria-label^="Unpin"]').should('exist');
    });

    // Command palette opens the dashboard and breadcrumbs resolve its name.
    cy.document().trigger('keydown', { key: 'k', ctrlKey: true });
    cy.get('.ui-command__input').type(renamedName);
    cy.get('.ui-command__item').first().click();
    cy.location('pathname', { timeout: 30000 }).should('include', `/dashboards/${dashboardId}`);
    cy.get('.breadcrumbs__current').should('contain', renamedName);

    // Delete shows an undo toast, and Undo restores the card.
    cy.visit('/dashboards');
    openCardMenu(renamedName);
    cy.contains('.ui-menu__item', 'Delete').click();
    cy.contains('.toast', 'Dashboard deleted').should('exist');
    cy.contains('.toast-action', 'Undo').click();
    cy.contains('.dashboard-card__title', renamedName, { timeout: 30000 }).should('exist');
    cy.contains('.toast', 'Dashboard restored').should('exist');
  });
});
