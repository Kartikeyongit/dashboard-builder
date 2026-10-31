describe('dashboard production smoke', () => {
  it('renders dashboard view and editor without a React error', () => {
    cy.visit('/login');
    cy.get('input[type="email"]').type('admin@acme.com');
    cy.get('input[type="password"]').type('password123');
    cy.get('button[type="submit"]').click();
    cy.url({ timeout: 20000 }).should('not.include', '/login');

    cy.visit('/dashboards/dddddddd-dddd-dddd-dddd-000000000001');
    cy.contains('Sales Overview', { timeout: 30000 }).should('be.visible');
    cy.contains('Unexpected Application Error').should('not.exist');
    cy.get('.dashboard-view-widget', { timeout: 30000 }).should('have.length.greaterThan', 0);
    cy.get('canvas', { timeout: 30000 }).should('have.length.greaterThan', 0);

    cy.visit('/dashboards/dddddddd-dddd-dddd-dddd-000000000001/edit');
    cy.contains('Unexpected Application Error').should('not.exist');
    cy.get('.react-grid-layout', { timeout: 30000 }).should('exist');
    cy.get('canvas', { timeout: 30000 }).should('have.length.greaterThan', 0);
  });
});
