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
| `npm run test:visual` | Capture visual-regression screenshots |
| `npm run visual:check` | Compare screenshots to the platform baselines |
| `npm run visual:update` | Recreate baselines for the current platform |
| `npm run budget` | Enforce the production bundle budgets |

The Cypress specs need the API on `:8099`, a seeded database, and a production
build pointed at that API. The root README has the exact commands.

## Accessibility

`cypress/e2e/a11y.cy.ts` scans login, register, home, datasources, queries,
dashboards, the dashboard viewer and editor, team, and settings with
`cypress-axe`. Home and the viewer are also scanned in dark mode. Only
**critical** and **serious** axe findings fail the run. The theme is pinned
before the app boots so the result does not depend on the CI host's system
preference.

## Visual regression

Screenshots of login, register, settings, and a dashboard chart are compared
with `pixelmatch`. Baselines live in `cypress/visual-baseline/<platform>/`
because font rasterisation differs between operating systems.

1. Run `npm run test:visual`.
2. Run `npm run visual:check` to compare, or `npm run visual:update` to accept
   the current screenshots as the baseline.
3. Commit the PNGs under `cypress/visual-baseline/`.

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
