/**
 * Compare Cypress visual screenshots against committed baselines.
 *
 * Baselines live in `cypress/visual-baseline/<platform>/`. Rendering differs
 * per operating system, so each platform keeps its own set. Run
 * `npm run visual:update` to (re)create the baselines for the current machine.
 *
 * Usage:
 *   node scripts/visual-regression.mjs [--update] [--require-baselines]
 *
 * Environment:
 *   VISUAL_THRESHOLD         pixelmatch colour threshold (default 0.2)
 *   VISUAL_ALLOWED_PERCENT   allowed differing pixels, percent (default 1.5)
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const shotsDir = path.resolve('cypress/screenshots/visual.cy.ts');
const baselineDir = path.resolve('cypress/visual-baseline', process.platform);
const diffDir = path.resolve('cypress/visual-diff', process.platform);

const update = process.argv.includes('--update');
const requireBaselines = process.argv.includes('--require-baselines');
const threshold = Number(process.env.VISUAL_THRESHOLD ?? 0.2);
const allowedPercent = Number(process.env.VISUAL_ALLOWED_PERCENT ?? 1.5);

if (!fs.existsSync(shotsDir)) {
  console.error(`No screenshots found in ${shotsDir}. Run \`npm run test:visual\` first.`);
  process.exit(1);
}

const screenshots = fs
  .readdirSync(shotsDir)
  .filter((file) => file.endsWith('.png') && !file.includes('(failed)'));

if (screenshots.length === 0) {
  console.error(`No screenshots found in ${shotsDir}. Run \`npm run test:visual\` first.`);
  process.exit(1);
}

fs.mkdirSync(baselineDir, { recursive: true });
fs.mkdirSync(diffDir, { recursive: true });

const failures = [];
let compared = 0;
let created = 0;

/**
 * Canvas charts render rows produced by the demo seed, which randomises its
 * sample data on every run. A pixel comparison would fail even when the UI is
 * unchanged, so the shot is captured for artifact review but not diffed.
 */
const UNSTABLE_SHOTS = new Set(['dashboard-chart.png']);

for (const name of screenshots) {
  if (UNSTABLE_SHOTS.has(name)) {
    console.log(`skip: ${name} (demo data is randomised)`);
    continue;
  }

  const actualPath = path.join(shotsDir, name);
  const baselinePath = path.join(baselineDir, name);

  if (update || !fs.existsSync(baselinePath)) {
    fs.copyFileSync(actualPath, baselinePath);
    created += 1;
    console.log(`baseline ${update ? 'updated' : 'created'}: ${path.relative(process.cwd(), baselinePath)}`);
    continue;
  }

  const actual = PNG.sync.read(fs.readFileSync(actualPath));
  const baseline = PNG.sync.read(fs.readFileSync(baselinePath));

  if (actual.width !== baseline.width || actual.height !== baseline.height) {
    failures.push(`${name}: size changed from ${baseline.width}x${baseline.height} to ${actual.width}x${actual.height}`);
    continue;
  }

  const diff = new PNG({ width: actual.width, height: actual.height });
  const changed = pixelmatch(actual.data, baseline.data, diff.data, actual.width, actual.height, {
    threshold,
  });
  const percent = (changed / (actual.width * actual.height)) * 100;
  compared += 1;

  if (percent > allowedPercent) {
    const diffPath = path.join(diffDir, name);
    fs.writeFileSync(diffPath, PNG.sync.write(diff));
    failures.push(
      `${name}: ${percent.toFixed(2)}% pixels differ (allowed ${allowedPercent}%). Diff: ${path.relative(process.cwd(), diffPath)}`,
    );
  } else {
    console.log(`ok: ${name} (${percent.toFixed(2)}% differ)`);
  }
}

if (created > 0 && !update && !requireBaselines) {
  console.log(`\n${created} baseline(s) created. Commit them so the next run can compare.`);
}

if (failures.length > 0) {
  console.error('\nVisual regression detected:');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

if (compared === 0 && created === 0) {
  console.error('Nothing to compare.');
  process.exit(1);
}
