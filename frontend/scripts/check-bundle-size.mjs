/**
 * Performance budget gate.
 *
 * Measures the gzip size of the production build and fails when the initial
 * payload or any single chunk grows past the budget. The thresholds are
 * deliberately a little above today's numbers so ordinary feature work has
 * room, while a careless dependency import is still caught.
 *
 * Run after `npm run build`.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const DIST = path.resolve('dist');
const HTML = path.join(DIST, 'index.html');

/** gzip KB budgets. */
const BUDGETS = {
  initialJs: 175,
  initialCss: 12,
  totalJs: 900,
  maxChunk: 270,
};

/** Chunks that must stay lazy: they cost far more than the first paint. */
const LAZY_ONLY = ['charts-vendor', 'grid-vendor', 'editor-vendor', 'monaco'];

if (!fs.existsSync(HTML)) {
  console.error('dist/index.html not found. Run `npm run build` first.');
  process.exit(1);
}

const gzipKb = (file) => zlib.gzipSync(fs.readFileSync(file)).length / 1024;
const round = (value) => Math.round(value * 10) / 10;

const html = fs.readFileSync(HTML, 'utf8');
// The entry script plus every modulepreload is what the browser downloads
// before the first paint. Stylesheets in the head are part of that payload too.
const initialAssets = [
  ...html.matchAll(/<(?:script[^>]*src|link[^>]*href)="([^"]+\.(?:js|css))"/g),
].map((match) => match[1]);

const assets = fs
  .readdirSync(path.join(DIST, 'assets'))
  .filter((file) => file.endsWith('.js') || file.endsWith('.css'));

let totalJs = 0;
let totalCss = 0;
const chunks = [];

for (const file of assets) {
  const absolute = path.join(DIST, 'assets', file);
  const size = gzipKb(absolute);
  if (file.endsWith('.js')) {
    totalJs += size;
    chunks.push({ file, size });
  } else {
    totalCss += size;
  }
}

const initialNames = initialAssets.map((asset) => path.basename(asset));
let initialJs = 0;
let initialCss = 0;

for (const asset of initialAssets) {
  const absolute = path.join(DIST, asset);
  if (!fs.existsSync(absolute)) {
    console.error(`index.html references a missing asset: ${asset}`);
    process.exit(1);
  }
  const size = gzipKb(absolute);
  if (asset.endsWith('.js')) initialJs += size;
  else initialCss += size;
}

const failures = [];
const check = (label, actual, budget) => {
  const status = actual <= budget ? 'ok' : 'OVER';
  console.log(`${label.padEnd(28)} ${round(actual).toString().padStart(8)} KB  budget ${budget} KB  ${status}`);
  if (actual > budget) failures.push(`${label} is ${round(actual)} KB (budget ${budget} KB)`);
};

console.log(`Initial payload (${initialNames.join(', ')})`);
check('initial JS (gzip)', initialJs, BUDGETS.initialJs);
check('initial CSS (gzip)', initialCss, BUDGETS.initialCss);
console.log('');
check('total JS (gzip)', totalJs, BUDGETS.totalJs);

console.log('\nLargest JS chunks (gzip)');
for (const chunk of chunks.sort((a, b) => b.size - a.size).slice(0, 8)) {
  console.log(`  ${chunk.file.padEnd(42)} ${round(chunk.size).toString().padStart(8)} KB`);
}

for (const chunk of chunks) {
  if (chunk.size > BUDGETS.maxChunk) {
    failures.push(`${chunk.file} is ${round(chunk.size)} KB (per-chunk budget ${BUDGETS.maxChunk} KB)`);
  }
}

console.log('\nLazy-only chunks must not be preloaded');
for (const name of LAZY_ONLY) {
  const preloaded = initialNames.find((asset) => asset.includes(name));
  const status = preloaded ? 'OVER' : 'ok';
  console.log(`  ${name.padEnd(28)} ${status}`);
  if (preloaded) failures.push(`${preloaded} is statically preloaded by index.html`);
}

if (failures.length > 0) {
  console.error('\nPerformance budget exceeded:');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(`\nAll performance budgets met (initial JS ${round(initialJs)} KB, total JS ${round(totalJs)} KB).`);
