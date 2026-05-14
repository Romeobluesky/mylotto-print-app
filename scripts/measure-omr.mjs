// Robust analyzer for lotto-omr-card.png — locates each game's first cell (1)
// by detecting the "A 1,000원" header row signatures and the number grid.

import { PNG } from 'pngjs';
import { readFileSync } from 'node:fs';

const png = PNG.sync.read(readFileSync('src/assets/lotto-omr-card.png'));
const { width: W, height: H, data } = png;
const PX_PER_MM = W / 190;
console.log(`image=${W}x${H}, ${PX_PER_MM.toFixed(3)} px/mm`);

function gray(x, y) {
  const i = (y * W + x) * 4;
  return (data[i] + data[i + 1] + data[i + 2]) / 3;
}

// Sum of redness (255 - average) per X for a Y band (header has red labels).
function colDarkness(y0, y1) {
  const out = new Float32Array(W);
  for (let x = 0; x < W; x++) {
    let s = 0;
    for (let y = y0; y < y1; y++) s += 255 - gray(x, y);
    out[x] = s / (y1 - y0);
  }
  return out;
}

function smooth(arr, win) {
  const out = new Float32Array(arr.length);
  for (let i = 0; i < arr.length; i++) {
    let s = 0, c = 0;
    for (let j = -win; j <= win; j++) {
      const k = i + j;
      if (k >= 0 && k < arr.length) { s += arr[k]; c++; }
    }
    out[i] = s / c;
  }
  return out;
}

// 1) Header band ~ y=24..50px contains "A 1,000원" etc per game.
// Find 5 plateaus of darkness separated by white gaps.
const headerBand = smooth(colDarkness(20, 60), 5);

// Find runs of "above-threshold" columns to identify each game header.
const thresh = 22; // tune
const runs = [];
let inRun = false, runStart = 0;
for (let x = 0; x < W; x++) {
  if (headerBand[x] > thresh) {
    if (!inRun) { inRun = true; runStart = x; }
  } else {
    if (inRun) {
      runs.push([runStart, x - 1]);
      inRun = false;
    }
  }
}
if (inRun) runs.push([runStart, W - 1]);

// Filter wide runs (likely game headers). Game header is ~25-30mm wide ≈ 300-360px.
const headerRuns = runs.filter((r) => r[1] - r[0] >= 40 && r[1] - r[0] <= 600);
console.log(`\nheader runs (in band y=20..60): ${headerRuns.length}`);
for (const r of headerRuns) {
  const w = r[1] - r[0];
  console.log(`  [${r[0]}..${r[1]}] width=${w}px (${(w/PX_PER_MM).toFixed(1)}mm) center=${((r[0]+r[1])/2).toFixed(0)}px (${((r[0]+r[1])/2/PX_PER_MM).toFixed(2)}mm)`);
}

// Heuristic: take the 5 widest runs that are roughly evenly spaced.
const top5 = [...headerRuns].sort((a,b)=>(b[1]-b[0])-(a[1]-a[0])).slice(0,5).sort((a,b)=>a[0]-b[0]);
console.log(`\ntop-5 widest runs (likely game headers):`);
const gameCenters = [];
top5.forEach((r, i) => {
  const cx = (r[0]+r[1])/2;
  gameCenters.push(cx);
  console.log(`  Game ${String.fromCharCode(65+i)}: center x=${cx.toFixed(0)}px = ${(cx/PX_PER_MM).toFixed(2)}mm`);
});

// 2) Within each game's X range, find vertical column positions by analyzing
//    the number-grid band (y ≈ 90..600px = 7.6..50.8mm — covers rows 1..7).
function findColumnsInRange(x0, x1, y0, y1) {
  const dens = smooth(colDarkness(y0, y1).slice(x0, x1+1), 3);
  // Find local peaks
  const peaks = [];
  for (let i = 2; i < dens.length - 2; i++) {
    if (dens[i] > 20 && dens[i] >= dens[i-1] && dens[i] >= dens[i+1] && dens[i] >= dens[i-2] && dens[i] >= dens[i+2]) {
      peaks.push(x0 + i);
    }
  }
  // Merge nearby peaks within 1.5mm (~18px)
  const merged = [];
  for (const p of peaks) {
    if (merged.length === 0 || p - merged[merged.length-1] > 18) merged.push(p);
    else {
      // pick the higher
      if (dens[p - x0] > dens[merged[merged.length-1] - x0]) merged[merged.length-1] = p;
    }
  }
  return merged;
}

console.log(`\n=== Per-game column analysis (y=120..600px = 10..51mm) ===`);
for (let gi = 0; gi < gameCenters.length; gi++) {
  const cx = gameCenters[gi];
  const halfWin = 16 * PX_PER_MM; // ±16mm around center
  const x0 = Math.max(0, Math.floor(cx - halfWin));
  const x1 = Math.min(W - 1, Math.ceil(cx + halfWin));
  const cols = findColumnsInRange(x0, x1, 120, 600);
  const label = String.fromCharCode(65 + gi);
  const first = cols[0];
  const last = cols[cols.length - 1];
  console.log(`  Game ${label}: ${cols.length} peaks in [${x0}..${x1}], first=${first}px (${(first/PX_PER_MM).toFixed(2)}mm), last=${last}px (${(last/PX_PER_MM).toFixed(2)}mm)`);
  if (cols.length >= 7) {
    const span = last - first;
    console.log(`    col-pitch ≈ ${(span/6/PX_PER_MM).toFixed(3)}mm (over ${cols.length-1} gaps)`);
    console.log(`    cols (mm): ${cols.map(c=>(c/PX_PER_MM).toFixed(2)).join(', ')}`);
  }
}

// 3) Find row Y positions within game A (use cols range).
const gameAcx = gameCenters[0];
if (gameAcx) {
  const x0 = Math.max(0, Math.floor(gameAcx - 12*PX_PER_MM));
  const x1 = Math.min(W-1, Math.ceil(gameAcx + 12*PX_PER_MM));
  // Row density: 255 - gray averaged across X band
  const rowDens = new Float32Array(H);
  for (let y = 0; y < H; y++) {
    let s = 0;
    for (let x = x0; x < x1; x++) s += 255 - gray(x, y);
    rowDens[y] = s / (x1 - x0);
  }
  const smoothed = smooth(rowDens, 4);
  // Find peaks above threshold
  const rowPeaks = [];
  for (let i = 4; i < smoothed.length - 4; i++) {
    if (smoothed[i] > 30 && smoothed[i] >= smoothed[i-1] && smoothed[i] >= smoothed[i+1]) {
      rowPeaks.push(i);
    }
  }
  // Merge nearby (within 2.5mm)
  const merged = [];
  for (const p of rowPeaks) {
    if (merged.length === 0 || p - merged[merged.length-1] > 30) merged.push(p);
  }
  console.log(`\n=== Row peaks in Game A column band ===`);
  for (const y of merged) console.log(`  y=${y}px (${(y/PX_PER_MM).toFixed(2)}mm)`);

  // Number rows should be 7 consecutive peaks spaced ~6.4mm apart.
  // Heuristic: find 7 peaks in 100..650px range with consistent spacing.
  const candidates = merged.filter((y) => y >= 80 && y <= 700);
  console.log(`\n  number-row candidates (y=80..700): ${candidates.length}`);
  if (candidates.length >= 7) {
    const first = candidates[0];
    const last = candidates[6];
    console.log(`  number row 1 y=${first}px (${(first/PX_PER_MM).toFixed(2)}mm)`);
    console.log(`  number row 7 y=${last}px (${(last/PX_PER_MM).toFixed(2)}mm)`);
    console.log(`  row-pitch ≈ ${((last-first)/6/PX_PER_MM).toFixed(3)}mm`);
  }
}
