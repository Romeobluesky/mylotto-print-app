// Verify game-specific cell-pitch / first-cell values against the actual
// scanned OMR image. Reads the constants from src/types/coordinates.ts (current
// values) and reports residual error per cell after applying them.

import { PNG } from 'pngjs';
import { readFileSync } from 'node:fs';

const png = PNG.sync.read(readFileSync('src/assets/lotto-omr-card.png'));
const { width: W, height: H, data } = png;
const PX_PER_MM = W / 190;
console.log(`image=${W}x${H}, ${PX_PER_MM.toFixed(3)} px/mm\n`);

function gray(x, y) { const i = (y * W + x) * 4; return (data[i] + data[i + 1] + data[i + 2]) / 3; }
function darkness(x, y) {
  if (x < 0 || y < 0 || x >= W || y >= H) return 0;
  return 255 - gray(x, y);
}

// Current best-fit values (mirror src/types/coordinates.ts).
const COL_PITCH = { A: 3.408, B: 3.418, C: 3.410, D: 3.419, E: 3.421 };
const ROW_PITCH = { A: 6.384, B: 6.360, C: 6.370, D: 6.375, E: 6.377 };
const FIRST = {
  A: { x: 44.52, y: 12.54 },
  B: { x: 71.93, y: 12.59 },
  C: { x: 99.36, y: 12.55 },
  D: { x: 126.78, y: 12.53 },
  E: { x: 154.21, y: 12.49 },
};
function cellExists(col, row) { return (row - 1) * 7 + col <= 45; }

function centroid(cx_mm, cy_mm, rx_mm, ry_mm, thresh = 60) {
  const cx = cx_mm * PX_PER_MM;
  const cy = cy_mm * PX_PER_MM;
  const rx = rx_mm * PX_PER_MM;
  const ry = ry_mm * PX_PER_MM;
  let sx = 0, sy = 0, sw = 0;
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const d = darkness(x, y);
      if (d > thresh) { sx += x * d; sy += y * d; sw += d; }
    }
  }
  if (sw === 0) return null;
  return { x_mm: sx / sw / PX_PER_MM, y_mm: sy / sw / PX_PER_MM };
}

console.log(`=== Residual after game-specific best-fit (cols 1-6, rows 1-6 + partial row 7) ===\n`);
console.log(`${'Game'.padEnd(6)} ${'pitch (col, row)'.padEnd(20)} ${'first cell'.padEnd(18)} ${'mean |Δx|'.padEnd(11)} ${'mean |Δy|'.padEnd(11)} ${'max |Δ|'}`);
for (const game of Object.keys(FIRST)) {
  const f = FIRST[game];
  const cp = COL_PITCH[game];
  const rp = ROW_PITCH[game];
  let n = 0, sAbsDx = 0, sAbsDy = 0, maxD = 0;
  for (let row = 1; row <= 7; row++) {
    for (let col = 1; col <= 6; col++) {
      if (!cellExists(col, row)) continue;
      const px = f.x + (col - 1) * cp;
      const py = f.y + (row - 1) * rp;
      const c = centroid(px, py, 1.3, 2.5);
      if (!c) continue;
      const dx = c.x_mm - px;
      const dy = c.y_mm - py;
      const d = Math.hypot(dx, dy);
      sAbsDx += Math.abs(dx);
      sAbsDy += Math.abs(dy);
      maxD = Math.max(maxD, d);
      n++;
    }
  }
  console.log(
    `${game.padEnd(6)} (${cp}, ${rp})${''.padEnd(20 - 16)} (${f.x}, ${f.y})${''.padEnd(18 - 16)} ${(sAbsDx / n).toFixed(3)}mm${''.padEnd(11 - 7)} ${(sAbsDy / n).toFixed(3)}mm${''.padEnd(11 - 7)} ${maxD.toFixed(3)}mm`,
  );
}
