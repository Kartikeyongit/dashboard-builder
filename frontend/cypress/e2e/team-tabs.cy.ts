/**
 * Team page layout regressions that do not need the seeded API.
 *
 * The tab bar is a scroll container and a flex child of the fixed-height
 * panel. Without an explicit flex basis it could shrink to a sliver when a
 * tab's content overflowed, which made the tabs disappear on the Invites tab.
 */
const ORG_ID = 'org-team';

const USER = {
  id: 'user-1',
  org_id: ORG_ID,
  email: 'admin@acme.com',
  role: 'admin',
  created_at: '2026-01-01T00:00:00Z',
};

const MEMBERS = [
  {
    id: 'user-1',
    org_id: ORG_ID,
    email: 'admin@acme.com',
    display_name: 'Admin',
    role: 'admin',
    created_at: '2026-01-01T00:00:00Z',
    last_login_at: '2026-03-01T00:00:00Z',
  },
];

const INVITES = Array.from({ length: 12 }, (_, index) => ({
  id: `invite-${index}`,
  org_id: ORG_ID,
  email: `teammate-${index}@acme.com`,
  role: 'viewer',
  invited_by_email: 'admin@acme.com',
  expires_at: '2026-04-01T00:00:00Z',
  expired: false,
  url: 'https://example.test/invite',
}));

const visitTeam = () => {
  cy.intercept('GET', '**/api/v1/me', { body: USER });
  cy.intercept('GET', '**/api/v1/dashboards', { body: [] });
  cy.intercept('GET', '**/api/v1/datasources', { body: [] });
  cy.intercept('GET', '**/api/v1/queries', { body: [] });
  cy.intercept('GET', '**/api/v1/team/members', { body: { members: MEMBERS } });
  cy.intercept('GET', '**/api/v1/team/invites', { body: { invites: INVITES } });
  cy.intercept('GET', '**/api/v1/team/audit*', { body: { events: [] } });

  cy.visit('/team', {
    onBeforeLoad(win) {
      win.localStorage.setItem('access_token', 'team-access-token');
      win.localStorage.setItem('refresh_token', 'team-refresh-token');
    },
  });
  cy.get('.team-tabs', { timeout: 20000 }).should('be.visible');
};

describe('team page tabs', () => {
  beforeEach(() => {
    cy.viewport(1280, 800);
    visitTeam();
  });

  it('keeps the tab bar intact when a tab overflows the panel', () => {
    cy.contains('.team-tab', 'Invites').click();
    cy.get('.invite-row').should('have.length', INVITES.length);

    // The panel scrolls rather than squashing its fixed children.
    cy.get('.team-tabs').should(($tabs) => {
      const rect = $tabs[0].getBoundingClientRect();
      expect(rect.height, 'tab bar height').to.be.greaterThan(40);
      expect(rect.width, 'tab bar width').to.be.greaterThan(200);
    });

    cy.get('.list-panel').should(($panel) => {
      expect($panel[0].scrollHeight, 'panel scrolls').to.be.greaterThan(
        $panel[0].clientHeight,
      );
    });

    cy.get('.team-tab').should('have.length', 3).and('be.visible');
  });

  it('keeps the tab bar intact when switching back to members', () => {
    cy.contains('.team-tab', 'Invites').click();
    cy.get('.invite-form').should('be.visible');

    cy.contains('.team-tab', 'Members').click();
    cy.get('.team-row').should('have.length', MEMBERS.length + 1);

    cy.get('.team-tabs').should(($tabs) => {
      expect($tabs[0].getBoundingClientRect().height, 'tab bar height').to.be.greaterThan(40);
    });
  });
});
