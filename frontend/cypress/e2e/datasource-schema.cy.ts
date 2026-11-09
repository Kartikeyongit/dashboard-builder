/**
 * Schema browser layout, without the seeded API.
 *
 * Each table section is a flex child of the scrollable list and uses
 * `overflow: hidden`, which gives it an automatic minimum height of zero.
 * Without a fixed flex basis the list squashed every section, clipping most
 * columns instead of scrolling.
 */
const ORG_ID = 'org-schema';

const USER = {
  id: 'user-1',
  org_id: ORG_ID,
  email: 'admin@acme.com',
  role: 'admin',
  created_at: '2026-01-01T00:00:00Z',
};

const DATASOURCE = {
  id: 'ds-1',
  org_id: ORG_ID,
  name: 'Warehouse',
  type: 'postgres',
  host: 'db.internal',
  port: 5432,
  db_name: 'analytics',
  username: 'reader',
  ssl_mode: 'require',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
};

const columns = (prefix: string, count: number) =>
  Array.from({ length: count }, (_, index) => ({
    name: `${prefix}_${index}`,
    data_type: index % 2 === 0 ? 'integer' : 'character varying',
  }));

const SCHEMA = [
  {
    table_name: 'very_long_table_name_for_a_customer_activity_stream',
    columns: columns('event', 9),
  },
  { table_name: 'sample_orders', columns: columns('order', 8) },
  { table_name: 'sample_products', columns: columns('product', 7) },
  { table_name: 'sample_customers', columns: columns('customer', 6) },
];

const visitDatasources = () => {
  cy.intercept('GET', '**/api/v1/me', { body: USER });
  cy.intercept('GET', '**/api/v1/datasources', { body: [DATASOURCE] });
  cy.intercept('GET', '**/api/v1/datasources/ds-1/schema', { body: SCHEMA }).as('schema');
  cy.intercept('GET', '**/api/v1/team/audit*', { body: { events: [] } });
  cy.intercept('GET', '**/api/v1/queries', { body: [] });
  cy.intercept('GET', '**/api/v1/dashboards', { body: [] });

  cy.visit('/datasources', {
    onBeforeLoad(win) {
      win.localStorage.setItem('access_token', 'schema-access-token');
      win.localStorage.setItem('refresh_token', 'schema-refresh-token');
    },
  });
  cy.contains('.list-card', 'Warehouse', { timeout: 20000 }).should('exist');
};

const openSchema = () => {
  cy.contains('button', 'Schema').click();
  cy.wait('@schema');
  cy.get('.schema-table', { timeout: 20000 }).should('have.length', SCHEMA.length);
};

describe('datasource schema browser', () => {
  beforeEach(() => {
    cy.viewport(1280, 800);
    visitDatasources();
  });

  it('shows every table section at full height and scrolls the list', () => {
    openSchema();

    cy.get('.schema-count').should('contain', '4 of 4 tables').and('contain', '30 columns');

    // The list is taller than its viewport, so it scrolls.
    cy.get('.schema-tables').should(($list) => {
      expect($list[0].scrollHeight, 'list scrolls').to.be.greaterThan($list[0].clientHeight);
    });

    // No section is squashed: its own content fits inside it.
    cy.get('.schema-table').should(($tables) => {
      $tables.each((_, table) => {
        expect(table.scrollHeight, 'table content is not clipped').to.be.at.most(
          table.clientHeight + 1,
        );
      });
    });

    cy.get('.schema-columns li').should(($rows) => {
      $rows.each((_, row) => {
        expect(row.getBoundingClientRect().height).to.be.greaterThan(0);
      });
    });
  });

  it('keeps the last table readable after scrolling', () => {
    openSchema();

    cy.get('.schema-table')
      .last()
      .scrollIntoView()
      .find('.schema-column-name')
      .should('have.length', SCHEMA[SCHEMA.length - 1].columns.length)
      .and('be.visible');

    cy.get('.schema-table').last().find('.schema-columns li').first().should('be.visible');
  });

  it('filters both tables and columns', () => {
    openSchema();

    cy.get('input[aria-label="Search schema"]').type('customer_3');
    cy.get('.schema-table').should('have.length', 1);
    cy.get('.schema-count').should('contain', '1 of 4 tables · 1 column');
    cy.contains('.schema-table-name', 'sample_customers').should('be.visible');
    cy.get('.schema-column-name').should('have.text', 'customer_3');

    cy.get('input[aria-label="Search schema"]').clear().type('sample_orders');
    cy.get('.schema-table').should('have.length', 1);
    cy.get('.schema-columns li').should('have.length', 8);
  });

  it('keeps a long table name inside the card on a phone', () => {
    cy.viewport(390, 844);
    openSchema();

    cy.get('.schema-table-header')
      .first()
      .should(($header) => {
        const header = $header[0];
        expect(header.scrollWidth, 'header does not overflow').to.be.at.most(
          header.clientWidth + 1,
        );
        const copy = header.querySelector('.schema-copy')!.getBoundingClientRect();
        expect(copy.right, 'copy button stays inside the card').to.be.at.most(
          header.getBoundingClientRect().right + 1,
        );
      });

    cy.get('.schema-table-name').first().should('have.css', 'text-overflow', 'ellipsis');
  });
});
