# Frontend

React 19 + Vite + Redux Toolkit. See the root [README](../README.md) for the
architecture, local setup, API reference, and UI conventions.

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server on `:5173` |
| `npm run build` | Type-check (`tsc -b`) and produce `dist/` |
| `npm run preview` | Serve the production build |
| `npm test` | Vitest unit tests |
| `npm run lint` | ESLint |
| `npm run test:e2e` | Production smoke spec |
| `npm run test:e2e:features` | Filters, exports, sharing, freshness |
| `npm run test:e2e:library` | Search, rename, pin, command palette, undo delete |
| `npm run test:e2e:builder` | Widget inspector, duplicate, refresh override |
| `npm run test:e2e:a11y` | axe scans of the key pages (light + dark) |
| `npm run test:e2e:home` | Signed-in home: fixtures, roles, states, list order |
| `npm run test:e2e:landing` | Public landing structure, CTAs, FAQ, mobile menu |
| `npm run test:visual` | Capture visual-regression screenshots |
| `npm run visual:check` | Compare screenshots to the platform baselines |
| `npm run visual:update` | Recreate baselines for the current platform |
| `npm run budget` | Enforce the production bundle budgets |
| `npm run og` | Regenerate `public/og.png` after a brand change |

The Cypress specs need the API on `:8099`, a seeded database, and a production
build pointed at that API. The root README has the exact commands.

## Accessibility

`cypress/e2e/a11y.cy.ts` scans the public landing page, login, register, home,
datasources, queries, dashboards, the dashboard viewer and editor, team, and
settings with `cypress-axe`. The landing page, home, and the viewer are also
scanned in dark mode; the landing page is additionally scanned at a mobile
viewport. Only **critical** and **serious** axe findings fail the run. The theme is pinned
before the app boots so the result does not depend on the CI host's system
preference.

`cypress/e2e/home.cy.ts` runs the same critical/serious scan against a
fixture-backed signed-in home, so the launchpad can be checked without the
seeded API.

`cypress/e2e/shell.cy.ts` is also fixture-backed. It covers the signed-in header,
grouped navigation rail, collapse persistence, breadcrumbs, account menu,
command palette, the mobile drawer (closed-tab-order, Escape, focus return), and
axe scans with the drawer and palette open.

## Visual regression

Screenshots of the landing page (desktop, dark, mobile, FAQ open), login,
register, home (desktop, dark, and mobile, fixture-backed), settings, and a
dashboard chart are compared with `pixelmatch`. Baselines live in
`cypress/visual-baseline/<platform>/` because font rasterisation differs
between operating systems.

1. Run `npm run test:visual`.
2. Run `npm run visual:check` to compare, or `npm run visual:update` to accept
   the current screenshots as the baseline.
3. Commit the PNGs under `cypress/visual-baseline/`.

The two home screenshots are fixture-backed. Capture them without the seeded
API with
`npx cypress run --spec cypress/e2e/visual.cy.ts --env visualHomeOnly=1`.

A missing baseline is created instead of failing (first run on a new platform).
Once baselines exist, more than 1.5% differing pixels fails the check and writes
a diff to `cypress/visual-diff/<platform>/`. Override the defaults with
`VISUAL_THRESHOLD` (pixelmatch colour threshold, default `0.2`) and
`VISUAL_ALLOWED_PERCENT` (default `1.5`). CI uploads screenshots and diffs as
artifacts.

## Performance budgets

`npm run budget` runs after `npm run build` and enforces:

| Budget | Limit |
|--------|-------|
| Initial JS (entry + modulepreload) | 175 KB gzip |
| Initial CSS | 12 KB gzip |
| Total JS | 900 KB gzip |
| Any single chunk | 270 KB gzip |

It also fails if ECharts, AG Grid, Monaco, or the editor vendor chunk is
preloaded by `index.html`. Keep heavy libraries inside lazy routes; the table
widget registers only the AG Grid modules it uses.

## Landing page

Anonymous visitors to `/` get the marketing page in
`src/components/landing/`; signed-in users get `AuthenticatedHome`. The public
header/footer live in `src/components/layout/PublicShell.tsx` and are not used
by the auth screens.

`index.html` holds the static title, description, OG/Twitter tags, and
`SoftwareApplication` JSON-LD. Absolute URLs come from `VITE_SITE_URL`; Render
supplies `RENDER_EXTERNAL_URL` at build time, so production needs no extra
configuration. Without either variable the build drops the canonical/`og:url`
tags and uses a root-relative preview image.

`public/og.png` is generated, not hand-edited: run `npm run og` after changing
the brand gradient in `src/styles/tokens.css`.
