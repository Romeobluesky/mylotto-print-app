import type { AppSettings, GameId, Offset } from '@shared/index';
import { GAMES } from '@shared/index';
import {
  PAGE_MM,
  cellPosition,
  autoCheckboxPosition,
  semiAutoCheckboxPosition,
} from '@shared/coordinates';

interface SlipPlan {
  /** Length exactly 5 (A..E). null = empty game (auto check). */
  games: (number[] | null)[];
}

// 인쇄 구조 — SVG 정수 픽셀 좌표(1200 DPI 그리드):
//   <div .page>
//     <svg width="83mm" height="${paperH}mm" viewBox="0 0 PX_W PX_H" shape-rendering="crispEdges" fill="#000">
//       <rect x="INT" y="INT" width="INT" height="INT"/>   — 모든 값이 정수
//     </svg>
//   </div>
//
// 가로 길이 균일성의 마지막 퍼즐 — mm 단위는 sub-pixel rasterization 에서
// 부동소수점 변환이 마크마다 다르게 라운드되어 ±1 픽셀 변동 발생.
//
// 해결: viewBox 를 1200 DPI 픽셀 단위로 두고, 모든 <rect> 의 x/y/width/height 를
// **정수 픽셀 값**으로 출력. SVG 의 width/height attribute 도 mm 단위로 박아두고
// CSS 로 늘리지 않음(width:100% 사용 금지) — viewBox ↔ device pixel 매핑을 깨면 안 됨.
//
// 1200 DPI 는 Samsung M2020 등 일반 레이저프린터의 실제 출력 해상도.
// 600 DPI 프린터에서는 정수 1200 DPI 픽셀 = 0.5 × 600 DPI 픽셀 단위가 되므로
// 결과적으로 인접 마크가 같은 0.5 픽셀 부분 위치에 떨어져 여전히 균일 유지.
const PORTRAIT_W = PAGE_MM.height; // 83mm
const PRINT_DPI = 1200;
const PX_PER_MM = PRINT_DPI / 25.4; // ≈ 47.2441

/** 인쇄 용지 세로 길이를 mm 단위로 반환. 사용자 보정값(0.1mm 단위)을 mm 로 변환. */
function portraitH(settings: AppSettings): number {
  return settings.paperHeight / 10;
}

export function planSlips(combinations: number[][]): SlipPlan[] {
  if (combinations.length === 0) return [];
  const slips: SlipPlan[] = [];
  for (let i = 0; i < combinations.length; i += 5) {
    const chunk = combinations.slice(i, i + 5);
    const games: (number[] | null)[] = [];
    for (let g = 0; g < 5; g++) {
      games.push(g < chunk.length ? chunk[g] : null);
    }
    slips.push({ games });
  }
  return slips;
}

/**
 * 한 슬립(=한 페이지)만 들어있는 독립 HTML 문서를 만든다.
 * 다중 인쇄 시 각 페이지를 별도의 print job 으로 보내기 위한 단위.
 * 페이지 경계 누적 오차의 근본 차단.
 */
export function buildSinglePageHtml(
  combinations: number[][],
  settings: AppSettings,
): string {
  const slips = planSlips(combinations);
  if (slips.length === 0) {
    return wrapDocument('', portraitH(settings));
  }
  // combinations 슬라이스가 이미 한 슬립(최대 5조합) 이라는 전제. 첫 슬립만 사용.
  return wrapDocument(renderSlipPage(slips[0], settings), portraitH(settings));
}

/** Test print: mark every cell 1..45 on every game + both checkboxes (자동/반자동). */
export function buildTestPrintHtml(settings: AppSettings): string {
  const ph = portraitH(settings);
  const rects: string[] = [];
  const dim = { w: settings.markWidth, h: settings.markHeight };
  const tm = settings.topMargin;
  for (const g of GAMES) {
    const offset = settings.offsets[g];
    const pitch = settings.pitchOffsets[g];
    for (let n = 1; n <= 45; n++) {
      rects.push(rotatedRect(cellPosition(g, n, offset, tm, pitch), dim, ph));
    }
    rects.push(
      rotatedRect(
        autoCheckboxPosition(g, offset, settings.checkboxOffsetY, tm, pitch),
        dim,
        ph,
      ),
    );
    rects.push(
      rotatedRect(
        semiAutoCheckboxPosition(g, offset, settings.checkboxOffsetY, tm, pitch),
        dim,
        ph,
      ),
    );
  }
  return wrapDocument(`<div class="page">${pageSvg(rects.join(''), ph)}</div>`, ph);
}

function renderSlipPage(slip: SlipPlan, settings: AppSettings): string {
  const ph = portraitH(settings);
  const rects: string[] = [];
  const dim = { w: settings.markWidth, h: settings.markHeight };
  const tm = settings.topMargin;
  slip.games.forEach((nums, idx) => {
    const game = GAMES[idx];
    const offset = settings.offsets[game];
    const pitch = settings.pitchOffsets[game];
    if (nums === null) {
      rects.push(
        rotatedRect(
          autoCheckboxPosition(game, offset, settings.checkboxOffsetY, tm, pitch),
          dim,
          ph,
        ),
      );
      return;
    }
    for (const n of nums) {
      rects.push(rotatedRect(cellPosition(game, n, offset, tm, pitch), dim, ph));
    }
    if (nums.length > 0 && nums.length < 6) {
      rects.push(
        rotatedRect(
          semiAutoCheckboxPosition(game, offset, settings.checkboxOffsetY, tm, pitch),
          dim,
          ph,
        ),
      );
    }
  });
  return `<div class="page">${pageSvg(rects.join(''), ph)}</div>`;
}

/**
 * landscape 좌표를 CCW 90° 회전 후, 1200 DPI 정수 픽셀 단위로 변환한 SVG <rect>.
 * 모든 마크의 width/height 가 정확히 같은 정수가 되므로 픽셀 너비 완벽 균일.
 */
function rotatedRect(
  pos: { x: number; y: number },
  dim: { w: number; h: number },
  portraitHMm: number,
): string {
  const widthMm = dim.w / 10;
  const heightMm = dim.h / 10;
  // CCW 90°: landscape (x, y) → portrait (y, portraitHMm - x)
  const cxMm = pos.y;
  const cyMm = portraitHMm - pos.x;
  // 회전 후 width/height 스왑
  const wMm = heightMm;
  const hMm = widthMm;
  const xMm = cxMm - wMm / 2;
  const yMm = cyMm - hMm / 2;
  // 1200 DPI 픽셀 단위 정수로 변환 (viewBox 와 같은 단위)
  const x = Math.round(xMm * PX_PER_MM);
  const y = Math.round(yMm * PX_PER_MM);
  const w = Math.round(wMm * PX_PER_MM); // 모든 마크 동일 (heightMm 상수에서 계산)
  const h = Math.round(hMm * PX_PER_MM); // 동일
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}"/>`;
}

function pageSvg(rectsHtml: string, phMm: number): string {
  // viewBox 는 1200 DPI 픽셀 단위. SVG 는 mm attribute 로 절대 크기를 박아두고
  // CSS 로 늘리지 않는다 — viewBox ↔ 출력 픽셀 매핑이 페이지마다 흔들리는 것을 방지.
  const vbW = (PORTRAIT_W * PX_PER_MM).toFixed(4);
  const vbH = (phMm * PX_PER_MM).toFixed(4);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${PORTRAIT_W}mm" height="${phMm}mm" viewBox="0 0 ${vbW} ${vbH}" shape-rendering="crispEdges" fill="#000000">${rectsHtml}</svg>`;
}

function wrapDocument(pagesHtml: string, portraitH: number): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>WinSpot OMR Print</title>
<style>
  @page {
    size: ${PORTRAIT_W}mm ${portraitH}mm;
    margin: 0;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #ffffff; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page {
    position: relative;
    width: ${PORTRAIT_W}mm;
    height: ${portraitH}mm;
    overflow: hidden;
    background: #ffffff;
  }
  /* SVG 의 width/height attribute(mm)를 그대로 신뢰. CSS 로 늘리지 않음. */
  svg { display: block; }
</style>
</head>
<body>
${pagesHtml}
</body>
</html>`;
}

export { portraitH };
export type { Offset, GameId };
