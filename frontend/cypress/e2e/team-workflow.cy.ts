/**
 * Phase 4B: a small team can onboard without direct database access.
 *
 * The admin creates an invite through the API (so the onboarding test is
 * independent), the invited teammate joins through the public link, updates
 * their profile and password, and the admin manages the member and reviews the
 * activity trail.
 */
const apiUrl = (Cypress.env('apiUrl') as string | undefined) ?? 'http://127.0.0.1:8099/api/v1';
const email = (Cypress.env('demoEmail') as string | undefined) ?? 'admin@acme.com';
const password = (Cypress.env('demoPassword') as string | undefined) ?? 'password123';

const runId = Date.now().toString(36);
const memberEmail = `cypress-member-${runId}@example.com`;
const uiInviteEmail = `cypress-invite-${runId}@example.com`;
const memberPassword = 'password123';
const memberNewPassword = 'newpassword123!';
const orgName = 'Acme Corp';

let adminToken = '';
let inviteUrl = '';

const adminHeaders = () => ({ Authorization: `Bearer ${adminToken}` });

const loginAsAdmin = () => {
  cy.session(
    'team-workflow-admin',
    () => {
      cy.request('POST', `${apiUrl}/auth/login`, { email, password }).then((res) => {
        window.localStorage.setItem('access_token', res.body.tokens.access_token);
        window.localStorage.setItem('refresh_token', res.body.tokens.refresh_token);
      });
    },
    { cacheAcrossSpecs: true },
  );
};

describe('team onboarding and management', () => {
  before(() => {
    cy.request('POST', `${apiUrl}/auth/login`, { email, password }).then((res) => {
      adminToken = res.body.tokens.access_token;
      cy.request({
        method: 'POST',
        url: `${apiUrl}/team/invites`,
        headers: adminHeaders(),
        body: { email: memberEmail, role: 'viewer' },
      }).then((inviteRes) => {
        inviteUrl = inviteRes.body.invite.url;
      });
    });
  });

  after(() => {
    if (!adminToken) return;
    cy.request({
      method: 'GET',
      url: `${apiUrl}/team/members`,
      headers: adminHeaders(),
    }).then((res) => {
      const member = (res.body.members as { id: string; email: string }[]).find(
        (item) => item.email === memberEmail,
      );
      if (member) {
        cy.request({
          method: 'DELETE',
          url: `${apiUrl}/team/members/${member.id}`,
          headers: adminHeaders(),
          failOnStatusCode: false,
        });
      }
    });
    cy.request({
      method: 'GET',
      url: `${apiUrl}/team/invites`,
      headers: adminHeaders(),
    }).then((res) => {
      const pending = (res.body.invites as { id: string; email: string }[]).filter(
        (item) => item.email === memberEmail || item.email === uiInviteEmail,
      );
      pending.forEach((item) => {
        cy.request({
          method: 'DELETE',
          url: `${apiUrl}/team/invites/${item.id}`,
          headers: adminHeaders(),
          failOnStatusCode: false,
        });
      });
    });
  });

  it('creates and revokes an invite link from the team page', () => {
    loginAsAdmin();
    cy.visit('/team');

    cy.contains('[role="tab"]', 'Invites').click();
    cy.get('.invite-form input[type="email"]').type(uiInviteEmail);
    cy.contains('button', 'Create invite link').click();

    cy.contains(`Invite ready for ${uiInviteEmail}`, { timeout: 30000 }).should('exist');
    cy.get('input[aria-label="New invite link"]')
      .invoke('val')
      .should('include', '/register?invite=');

    cy.contains('.invite-row__email', uiInviteEmail, { timeout: 30000 }).should('exist');
    cy.get(`button[aria-label="Revoke invite for ${uiInviteEmail}"]`).click();
    cy.contains('button', 'Revoke invite').click();
    cy.contains('.invite-row__email', uiInviteEmail).should('not.exist');
  });

  it('onboards an invited teammate and lets them update their profile', () => {
    cy.clearLocalStorage();
    cy.visit(inviteUrl);

    cy.contains('h2', `Join ${orgName}`, { timeout: 30000 }).should('exist');
    cy.get('#invite-name').type('Cypress Teammate');
    cy.get('input[type="password"]').type(memberPassword);
    cy.contains('button', 'Join team').click();

    // The new member lands in the app with the viewer role.
    cy.get('.sidebar', { timeout: 30000 }).should('contain', 'Team');
    cy.visit('/team');
    cy.contains('.team-person__email', memberEmail, { timeout: 30000 }).should('exist');
    cy.get('.team-note').should('contain', 'viewing the directory');
    cy.contains('[role="tab"]', 'Invites').should('not.exist');

    cy.visit('/settings');
    cy.contains('h2', 'Your settings', { timeout: 30000 }).should('exist');
    cy.get('.settings-card').first().find('input').first().clear().type('Cypress Teammate');
    cy.get('.settings-card').first().find('select').select('Asia/Kolkata');
    cy.contains('button', 'Save profile').click();
    cy.contains('Profile saved', { timeout: 30000 }).should('exist');

    cy.reload();
    cy.get('.settings-card', { timeout: 30000 })
      .first()
      .find('input')
      .first()
      .should('have.value', 'Cypress Teammate');

    // Password change takes effect immediately for the next sign-in.
    const passwordInputs = () => cy.get('.settings-card').last().find('input[type="password"]');
    passwordInputs().eq(0).type(memberPassword);
    passwordInputs().eq(1).type(memberNewPassword);
    passwordInputs().eq(2).type(memberNewPassword);
    cy.contains('button', 'Update password').click();
    cy.contains('Password updated', { timeout: 30000 }).should('exist');

    cy.request({
      method: 'POST',
      url: `${apiUrl}/auth/login`,
      body: { email: memberEmail, password: memberPassword },
      failOnStatusCode: false,
    }).its('status').should('eq', 401);
    cy.request('POST', `${apiUrl}/auth/login`, {
      email: memberEmail,
      password: memberNewPassword,
    }).its('status').should('eq', 200);
  });

  it('shows the new member in activity and lets an admin change or remove them', () => {
    loginAsAdmin();
    cy.visit('/team');

    cy.contains('[role="tab"]', 'Activity').click();
    cy.contains('.activity-title', 'Invited a teammate', { timeout: 30000 }).should('exist');
    cy.contains('.activity-title', 'Joined the team').should('contain', memberEmail);

    cy.contains('[role="tab"]', 'Members').click();
    cy.contains('.team-person__email', memberEmail, { timeout: 30000 })
      .closest('.team-row')
      .within(() => {
        cy.get('select').select('editor');
      });
    cy.contains('is now editor', { timeout: 30000 }).should('exist');

    cy.contains('.team-person__email', memberEmail)
      .closest('.team-row')
      .within(() => {
        cy.get(`button[aria-label="Remove ${memberEmail}"]`).click();
      });
    cy.contains('button', 'Remove member').click();
    cy.contains('.team-person__email', memberEmail, { timeout: 30000 }).should('not.exist');

    cy.contains('[role="tab"]', 'Activity').click();
    cy.contains('.activity-title', 'Removed a member', { timeout: 30000 }).should('exist');
  });
});
