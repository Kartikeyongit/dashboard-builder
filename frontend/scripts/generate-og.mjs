/**
 * Generate the 1200x630 social preview image in public/og.png.
 *
 * Social crawlers do not run JavaScript, so the image is a committed artifact.
 * Re-run `npm run og` after changing the brand colors in tokens.css.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const W = 1200;
const H = 630;
const png = new PNG({ width: W, height: H });

const set = (x, y, r, g, b, alpha = 1) => {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (W * y + x) << 2;
  const a = Math.max(0, Math.min(1, alpha));
  png.data[i] = Math.round(png.data[i] * (1 - a) + r * a);
  png.data[i + 1] = Math.round(png.data[i + 1] * (1 - a) + g * a);
  png.data[i + 2] = Math.round(png.data[i + 2] * (1 - a) + b * a);
  png.data[i + 3] = 255;
};

const roundedRect = (x, y, w, h, radius, color, alpha = 1) => {
  for (let py = y; py < y + h; py += 1) {
    for (let px = x; px < x + w; px += 1) {
      const dx = Math.min(px - x, x + w - 1 - px);
      const dy = Math.min(py - y, y + h - 1 - py);
      if (dx < radius && dy < radius) {
        const cx = radius - dx;
        const cy = radius - dy;
        if (cx * cx + cy * cy > radius * radius) continue;
      }
      set(px, py, color[0], color[1], color[2], alpha);
    }
  }
};

const circle = (cx, cy, radius, color, alpha = 1) => {
  for (let py = Math.round(cy - radius); py <= cy + radius; py += 1) {
    for (let px = Math.round(cx - radius); px <= cx + radius; px += 1) {
      const dx = px - cx;
      const dy = py - cy;
      if (dx * dx + dy * dy <= radius * radius) set(px, py, color[0], color[1], color[2], alpha);
    }
  }
};

// Background gradient, deep navy to indigo.
for (let y = 0; y < H; y += 1) {
  const t = y / H;
  const r = Math.round(11 + (30 - 11) * t);
  const g = Math.round(17 + (27 - 17) * t);
  const b = Math.round(32 + (75 - 32) * t);
  for (let x = 0; x < W; x += 1) set(x, y, r, g, b, 1);
}

// Indigo glow behind the card.
for (let y = 0; y < H; y += 1) {
  for (let x = 0; x < W; x += 1) {
    const dx = (x - 980) / 460;
    const dy = (y - 30) / 420;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < 1) set(x, y, 99, 102, 241, 0.34 * (1 - d) ** 2);
  }
}

// Soft cyan glow bottom-left.
for (let y = 0; y < H; y += 1) {
  for (let x = 0; x < W; x += 1) {
    const dx = (x - 40) / 360;
    const dy = (y - 620) / 320;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < 1) set(x, y, 34, 211, 238, 0.16 * (1 - d) ** 2);
  }
}

// Card shadow, then the card.
roundedRect(122, 132, 980, 460, 26, [0, 0, 0], 0.35);
roundedRect(110, 110, 980, 460, 26, [248, 250, 252], 1);

// Browser chrome.
for (let x = 112; x < 1088; x += 1) {
  for (let y = 110; y < 168; y += 1) set(x, y, 241, 245, 249, 1);
}
roundedRect(110, 110, 978, 58, 26, [241, 245, 249], 1);
for (let x = 110; x < 1090; x += 1) {
  for (let y = 140; y < 170; y += 1) if (y > 140) set(x, y, 241, 245, 249, 1);
}
for (let x = 110; x < 1090; x += 1) set(x, 168, 226, 232, 240, 1);

circle(142, 139, 6, [239, 68, 68]);
circle(164, 139, 6, [245, 158, 11]);
circle(186, 139, 6, [16, 185, 129]);
roundedRect(930, 129, 138, 22, 11, [224, 231, 255]);
circle(944, 140, 4, [5, 150, 105]);

// Three metric cards.
const metrics = [
  { x: 140, tint: [99, 102, 241] },
  { x: 440, tint: [8, 145, 178] },
  { x: 740, tint: [16, 185, 129] },
];
for (const metric of metrics) {
  roundedRect(metric.x, 190, 280, 96, 14, [241, 245, 249]);
  roundedRect(metric.x + 18, 210, 42, 8, 4, metric.tint, 0.75);
  roundedRect(metric.x + 18, 238, 132, 18, 5, [100, 116, 139], 0.9);
  roundedRect(metric.x + 18, 262, 66, 8, 4, metric.tint, 0.55);
}

// Bar chart.
const bars = [52, 76, 44, 92, 68, 108, 82, 126, 96, 148, 112, 136];
const baseY = 540;
const barWidth = 46;
const gap = 26;
bars.forEach((height, index) => {
  const x = 142 + index * (barWidth + gap);
  roundedRect(x, baseY - height, barWidth, height, 6, [79, 70, 229], 0.9);
});

// Right-hand summary rows.
for (let index = 0; index < 3; index += 1) {
  const y = 214 + index * 62;
  roundedRect(790, y, 268, 46, 10, [255, 255, 255]);
  roundedRect(790, y, 268, 46, 10, [226, 232, 240], 0.9);
  roundedRect(802, y + 12, 108, 8, 4, [100, 116, 139], 0.55);
  roundedRect(802, y + 26, 66, 6, 3, [148, 163, 184], 0.4);
  roundedRect(1004, y + 16, 40, 14, 7, [224, 231, 255]);
}

// Bottom edge accent line.
for (let x = 0; x < W; x += 1) {
  const alpha = 0.7 * (1 - Math.abs(x - W / 2) / (W / 2));
  set(x, H - 4, 129, 140, 248, alpha);
  set(x, H - 3, 129, 140, 248, alpha);
}

fs.mkdirSync(path.resolve('public'), { recursive: true });
png.pack().pipe(fs.createWriteStream(path.resolve('public/og.png')));
