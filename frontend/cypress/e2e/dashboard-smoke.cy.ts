describe('dashboard production smoke', () => {
  it('renders dashboard view and editor without a React error', () => {
    cy.visit('/');
    cy.contains('a', 'Sign in').first().click();
    cy.get('input[type="email"]').type('admin@acme.com');
    cy.get('input[type="password"]').type('password123');
    cy.get('button[type="submit"]').click();
    cy.url({ timeout: 30000 }).should('not.include', '/login');

    // Navigate through the UI so the test also works on static hosts that do
    // not rewrite deep links to index.html.
    cy.contains('a', 'Dashboards').click();
    cy.get('.list-card').first().contains('a', 'View').click();
    cy.contains('Unexpected Application Error').should('not.exist');
    cy.get('.dashboard-view-widget', { timeout: 30000 }).should('have.length.greaterThan', 0);
    cy.get('canvas', { timeout: 30000 }).should('have.length.greaterThan', 0);

    cy.contains('a', 'Edit').click();
    cy.contains('Unexpected Application Error').should('not.exist');
    cy.get('.react-grid-layout', { timeout: 30000 }).should('exist');
    cy.get('canvas', { timeout: 30000 }).should('have.length.greaterThan', 0);
  });
});
