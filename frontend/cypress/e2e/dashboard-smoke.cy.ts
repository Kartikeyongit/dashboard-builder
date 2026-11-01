describe('dashboard production smoke', () => {
  it('renders dashboard view and editor without a React error', () => {
    cy.visit('/');
    cy.contains('a', 'Sign in').first().click();
    cy.get('input[type="email"]').type('admin@acme.com');
    cy.get('input[type="password"]').type('password123');
    cy.get('button[type="submit"]').click();
    cy.url({ timeout: 30000 }).should('not.include', '/login');

    // Navigate through the UI so the test also works on static hosts that do
    // not rewrite deep links to index.html. Pick the seeded "Sales Overview"
    // dashboard explicitly: it is the one guaranteed to contain charts, while
    // the list is ordered newest first and may open a table-only dashboard.
    cy.contains('a', 'Dashboards').click();
    cy.contains('.list-card', 'Sales Overview').contains('a', 'View').click();
    cy.contains('Unexpected Application Error').should('not.exist');
    cy.get('.dashboard-view-widget', { timeout: 30000 }).should('have.length.greaterThan', 0);
    cy.get('canvas', { timeout: 30000 }).should('have.length.greaterThan', 0);

    cy.contains('a', 'Edit').click();
    cy.contains('Unexpected Application Error').should('not.exist');
    cy.get('.react-grid-layout', { timeout: 30000 }).should('exist');
    cy.get('canvas', { timeout: 30000 }).should('have.length.greaterThan', 0);
  });
});
