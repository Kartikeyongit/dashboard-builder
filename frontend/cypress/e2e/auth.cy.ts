/**
 * Auth screens without the seeded API.
 *
 * Covers the client-side rules, focus management, invite variants, and the
 * narrow layout so the auth pages do not depend on backend data.
 */
const INVITE = {
  org_name: 'Acme Analytics',
  email: 'new.reader@acme.com',
  role: 'editor',
  expires_at: '2026-12-01T00:00:00Z',
};

const formatViolations = (
  violations: { id: string; impact?: string | null; help: string; nodes: { target: string[]; failureSummary?: string }[] }[],
) =>
  violations
    .map((violation) =>
      [
        `${violation.id} (${violation.impact}): ${violation.help}`,
        ...violation.nodes.map(
          (node) => `  ${node.target.join(' ')} :: ${node.failureSummary ?? ''}`,
        ),
      ].join('\n'),
    )
    .join('\n\n');

const scan = () => {
  cy.injectAxe();
  cy.checkA11y(
    undefined,
    { includedImpacts: ['critical', 'serious'], retries: 2, interval: 200 },
    (violations) => {
      if (violations.length > 0) throw new Error(formatViolations(violations));
    },
    true,
  );
};

const visitLogin = (theme: 'light' | 'dark' = 'light') => {
  cy.clearLocalStorage();
  cy.visit('/login', {
    onBeforeLoad(win) {
      win.localStorage.setItem('dashboard-builder-theme', theme);
    },
  });
  cy.contains('h1', 'Welcome back', { timeout: 20000 }).should('be.visible');
};

const visitRegister = (search = '', theme: 'light' | 'dark' = 'light') => {
  cy.clearLocalStorage();
  cy.visit(`/register${search}`, {
    onBeforeLoad(win) {
      win.localStorage.setItem('dashboard-builder-theme', theme);
    },
  });
};

describe('sign in', () => {
  beforeEach(() => {
    cy.viewport(1280, 800);
  });

  it('labels the fields and validates before calling the API', () => {
    cy.intercept('POST', '**/api/v1/auth/login').as('loginRequest');
    visitLogin();

    cy.get('label[for="login-email"]').should('contain', 'Email');
    cy.get('#login-email')
      .should('have.attr', 'type', 'email')
      .and('have.attr', 'autocomplete', 'email');
    cy.get('label[for="login-password"]').should('contain', 'Password');
    cy.get('#login-password').should('have.attr', 'autocomplete', 'current-password');

    cy.get('button[type="submit"]').click();

    cy.contains('p', 'Enter your email address.').should('be.visible');
    cy.contains('p', 'Enter your password.').should('be.visible');
    cy.get('#login-email').should('be.focused').and('have.attr', 'aria-invalid', 'true');
    cy.get('@loginRequest.all').should('have.length', 0);
  });

  it('announces a rejected sign-in and focuses the summary', () => {
    cy.intercept('POST', '**/api/v1/auth/login', {
      statusCode: 401,
      body: { message: 'invalid credentials' },
    }).as('loginRequest');

    visitLogin();
    cy.get('#login-email').type('admin@acme.com');
    cy.get('#login-password').type('wrong-password');
    cy.get('button[type="submit"]').click();
    cy.wait('@loginRequest');

    cy.get('.auth-alert')
      .should('contain', 'Email or password is incorrect.')
      .and('be.focused');
    cy.get('#login-email').should('have.value', 'admin@acme.com');
  });

  it('toggles password visibility from the keyboard', () => {
    visitLogin();

    cy.get('#login-password').should('have.attr', 'type', 'password');

    // The toggle must be tabbable, not just clickable.
    cy.get('button[aria-label="Show password"]').focus().should('be.focused').click();
    cy.get('#login-password').should('have.attr', 'type', 'text');
    cy.get('button[aria-label="Hide password"]')
      .should('have.attr', 'aria-pressed', 'true')
      .and('be.focused');

    cy.get('button[aria-label="Hide password"]').click();
    cy.get('#login-password').should('have.attr', 'type', 'password');
  });

  it('passes axe in light and dark themes', () => {
    visitLogin();
    scan();

    visitLogin('dark');
    cy.get('html').should('have.attr', 'data-theme', 'dark');
    cy.get('.auth-story').should('be.visible');
    scan();
  });
});

describe('create account', () => {
  beforeEach(() => {
    cy.viewport(1280, 800);
  });

  it('passes axe in light and dark themes', () => {
    visitRegister();
    cy.contains('h1', 'Create an account', { timeout: 20000 }).should('be.visible');
    scan();

    visitRegister('', 'dark');
    cy.get('html').should('have.attr', 'data-theme', 'dark');
    cy.contains('h1', 'Create an account', { timeout: 20000 }).should('be.visible');
    scan();
  });

  it('associates every label and explains the enforced password rule', () => {
    visitRegister();
    cy.contains('h1', 'Create an account', { timeout: 20000 }).should('be.visible');

    cy.get('label[for="register-org"]').should('contain', 'Organization name');
    cy.get('#register-org').should('have.attr', 'required');
    cy.get('label[for="register-email"]').should('contain', 'Email');
    cy.get('label[for="register-password"]').should('contain', 'Password');

    cy.get('#register-password').type('abcdef');
    cy.get('.auth-strength__label').should('have.text', 'Fair');
    cy.get('.auth-strength__rule')
      .should('have.class', 'auth-strength__rule--met')
      .and('contain', 'At least 6 characters');
    cy.contains('.auth-strength__tip', 'Add uppercase letters').should('be.visible');
  });

  it('blocks submission until the required fields are valid', () => {
    cy.intercept('POST', '**/api/v1/auth/register').as('registerRequest');
    visitRegister();
    cy.contains('h1', 'Create an account', { timeout: 20000 }).should('be.visible');

    cy.get('#register-org').type('Acme');
    cy.get('#register-email').type('not-an-email');
    cy.get('#register-password').type('12345');
    cy.get('button[type="submit"]').click();

    cy.contains('p', 'Enter a valid email address.').should('be.visible');
    cy.contains('p', 'Use at least 6 characters.').should('be.visible');
    cy.get('#register-email').should('be.focused');
    cy.get('@registerRequest.all').should('have.length', 0);
  });

  it('names the invited team and keeps the invited email read-only', () => {
    cy.intercept('GET', '**/api/v1/invites/invite-token', { body: INVITE }).as('invite');
    visitRegister('?invite=invite-token');
    cy.wait('@invite');

    cy.contains('h1', 'Join Acme Analytics', { timeout: 20000 }).should('be.visible');
    cy.contains('p', 'You were invited as editor.').should('be.visible');
    cy.get('#register-email')
      .should('have.value', 'new.reader@acme.com')
      .and('have.attr', 'readonly');
    cy.get('#register-org').should('not.exist');
    cy.get('#register-password').should('have.attr', 'minlength', '8');
    cy.get('.auth-strength__rule').should('contain', 'At least 8 characters');
  });

  it('offers a recovery route when the invite is invalid', () => {
    cy.intercept('GET', '**/api/v1/invites/expired', {
      statusCode: 404,
      body: { message: 'This invite link is no longer valid.' },
    });
    visitRegister('?invite=expired');

    cy.get('.auth-invite-help')
      .should('be.visible')
      .and('contain', 'This invite link is no longer valid.')
      .and('be.focused');
    cy.contains('a', 'Create an organization').should('have.attr', 'href', '/register');
    cy.get('form').should('not.exist');
  });

  it('fits narrow phone widths without horizontal overflow', () => {
    cy.viewport(320, 720);
    visitRegister();
    cy.contains('h1', 'Create an account', { timeout: 20000 }).should('be.visible');
    cy.get('.auth-brand-name').should('not.be.visible');

    cy.document().then((doc) => {
      expect(doc.documentElement.scrollWidth, 'no horizontal overflow at 320px').to.be.at.most(
        doc.documentElement.clientWidth + 1,
      );
    });

    cy.viewport(390, 844);
    cy.get('button[type="submit"]').scrollIntoView().should('be.visible');
    cy.get('label[for="register-password"]').should('be.visible');

    cy.document().then((doc) => {
      expect(doc.documentElement.scrollWidth, 'no horizontal overflow at 390px').to.be.at.most(
        doc.documentElement.clientWidth + 1,
      );
    });
  });
});
