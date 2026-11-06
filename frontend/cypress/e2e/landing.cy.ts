/**
 * Public landing behaviour.
 *
 * These assertions are intentionally copy-light: they check structure,
 * conversion paths, and the FAQ contract so redesigns do not silently break
 * the page's job.
 */
describe('public landing', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.setItem('dashboard-builder-theme', 'light');
      },
    });
    cy.contains('h1', /live dashboard/i, { timeout: 20000 }).should('be.visible');
  });

  it('renders the marketing page without app chrome', () => {
    cy.get('.lp-hero').should('be.visible');
    cy.get('.sidebar').should('not.exist');
    cy.get('.welcome-greeting').should('not.exist');
  });

  it('points the primary conversion paths at signup', () => {
    cy.get('.lp-hero__actions').find('a[href="/register"]').should('contain', 'Start free');
    cy.get('.lp-header').find('a[href="/register"]').should('exist');
    cy.get('.lp-header').find('a[href="/login"]').should('contain', 'Sign in');
  });

  it('exposes the FAQ state to assistive technology', () => {
    cy.get('#faq-question-0').should('have.attr', 'aria-expanded', 'true');
    cy.get('#faq-answer-0').should('be.visible');

    cy.get('#faq-question-1').click();
    cy.get('#faq-question-1').should('have.attr', 'aria-expanded', 'true');
    cy.get('#faq-answer-1').should('be.visible');
    cy.get('#faq-question-0').should('have.attr', 'aria-expanded', 'false');
    cy.get('#faq-answer-0').should('not.be.visible');
  });

  it('opens and closes the mobile menu with Escape', () => {
    cy.viewport(390, 844);
    cy.get('.lp-menu-btn').should('be.visible').and('have.attr', 'aria-expanded', 'false');
    cy.get('.lp-menu-btn').click();
    cy.get('.lp-menu-btn').should('have.attr', 'aria-expanded', 'true');
    cy.get('#lp-mobile-menu').should('be.visible');

    cy.get('body').type('{esc}');
    cy.get('.lp-menu-btn').should('have.attr', 'aria-expanded', 'false');
    cy.get('#lp-mobile-menu').should('not.be.visible');
  });

  it('does not present a fake product domain', () => {
    cy.document().its('body.innerText').should('not.contain', 'dashboardbuilder.io');
  });
});
