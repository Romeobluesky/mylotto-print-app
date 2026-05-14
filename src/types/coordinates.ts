import type { GameId, Offset } from './index';
import { GAMES } from './index';

/**
 * OMR 설계 이미지(`src/assets/lotto-omr-card.png`) 기준 dimensions — landscape.
 *   width = 190mm (가로), height = 83mm (세로)
 * 실제 물리 용지는 portrait 83×190mm 이지만, 설계 좌표는 PNG 이미지의
 * landscape 방향으로 정의하고 인쇄 시 CCW 90° 회전한다.
 */
export const PAGE_MM = { width: 190, height: 83 } as const;

// 좌표는 실물 OMR 스캔(2244×980px, 11.811px/mm, `src/assets/lotto-omr-card.png`)
// 의 셀 중심을 centroid 기반으로 측정한 게임별 best-fit 값.
// 측정·재계산 스크립트: `node scripts/verify-prd.mjs`
// PRD §5.3 의 단일 표기값(col=3.412, row=6.372)은 5개 게임의 평균 근사로,
// 우측 게임(D, E)일수록 평균과 어긋난다 — 그래서 game 별 dict 로 분리.
export const COL_PITCH_MM: Record<GameId, number> = {
  A: 3.408,
  B: 3.418,
  C: 3.410,
  D: 3.419,
  E: 3.421,
};

export const ROW_PITCH_MM: Record<GameId, number> = {
  A: 6.384,
  B: 6.360,
  C: 6.370,
  D: 6.375,
  E: 6.377,
};

// 게임별 1번 셀(col 1·row 1) 중심 landscape 좌표 — 실측 best-fit.
export const FIRST_CELL_MM: Record<GameId, { x: number; y: number }> = {
  A: { x: 44.52, y: 12.54 },
  B: { x: 71.93, y: 12.59 },
  C: { x: 99.36, y: 12.55 },
  D: { x: 126.78, y: 12.53 },
  E: { x: 154.21, y: 12.49 },
};

/**
 * 미리보기 전용 X 보정 (mm).
 * 인쇄 좌표가 실측 OMR 카드 이미지 좌표와 1:1 대응하므로 0.
 */
export const PREVIEW_X_SHIFT_MM = 0;

/**
 * 미리보기 전용 topMargin baseline (0.1mm 단위).
 * 사용자가 실제 인쇄 정렬용으로 쓰는 topMargin 의 "기본값".
 * 인쇄 시 회전·프린터 leading-edge 마진 등으로 인해 이 baseline 에서 마크가 OMR
 * 셀에 정확히 들어가는데, 미리보기는 회전이 없어 같은 값을 그대로 적용하면 마크가
 * 왼쪽으로 시프트되어 셀 밖으로 나간다. 미리보기에서만 이 값을 빼서 시각적으로
 * 셀 안에 들어가도록 보정. 실제 인쇄 좌표에는 영향 없음.
 */
export const PREVIEW_TOPMARGIN_BASELINE = -36;

/**
 * 인쇄 페이지의 세로 길이(mm) 기본값 = 표준 OMR 용지 길이.
 * 실제 런타임에서는 `AppSettings.paperHeight`(0.1mm 단위)를 사용한다.
 * 실측 용지가 ±0.5mm 다를 경우 사용자가 설정창에서 보정.
 */
export const PRINT_PORTRAIT_H_MM_DEFAULT = 190;

/**
 * 자동/반자동 체크박스 위치.
 * X 는 각 게임의 가장 오른쪽 마킹 열(col 7, index 6)과 동일한 X 좌표 — 자동 정렬.
 * - `checkboxOffsetY`(0.1mm): 절대 Y 좌표 (landscape 상단 기준) — 기본 70.0mm
 * - `topMargin`(0.1mm): 모든 마크를 landscape_x 방향으로 시프트 (paper view 에서는 아래로 이동)
 * - `pitchOffset`(0.1mm): col 7 시프트량. 1/6 분배되어 col-pitch 에 가산되므로
 *   체크박스(col 7 위치 정렬)는 사용자가 입력한 0.1mm 값만큼 정확히 이동한다.
 */
export function autoCheckboxPosition(
  game: GameId,
  offset: Offset,
  checkboxOffsetY: number,
  topMargin: number,
  pitchOffset: Offset = { x: 0, y: 0 },
): { x: number; y: number } {
  const first = FIRST_CELL_MM[game];
  // 마지막 마킹 열(col index 6 = 7번 열)의 X 좌표와 일치.
  // 6 * (COL_PITCH + pitchOffset/60) = 6*COL_PITCH + pitchOffset/10
  const lastColX = first.x + 6 * COL_PITCH_MM[game] + pitchOffset.x * 0.1;
  return {
    x: lastColX + offset.x * 0.1 + topMargin * 0.1,
    y: checkboxOffsetY * 0.1 + offset.y * 0.1,
  };
}

export function semiAutoCheckboxPosition(
  game: GameId,
  offset: Offset,
  checkboxOffsetY: number,
  topMargin: number,
  pitchOffset: Offset = { x: 0, y: 0 },
): { x: number; y: number } {
  return autoCheckboxPosition(game, offset, checkboxOffsetY, topMargin, pitchOffset);
}

export function cellPosition(
  game: GameId,
  number: number,
  offset: Offset,
  topMargin: number,
  pitchOffset: Offset = { x: 0, y: 0 },
): { x: number; y: number } {
  const col = (number - 1) % 7;
  const row = Math.floor((number - 1) / 7);
  const first = FIRST_CELL_MM[game];
  // pitchOffset.x: col 7 시프트(0.1mm). 1/6 분배해 col-pitch 에 추가.
  // pitchOffset.y: row 7 시프트(0.1mm). 1/6 분배해 row-pitch 에 추가.
  const colPitchDelta = (pitchOffset.x * 0.1) / 6;
  const rowPitchDelta = (pitchOffset.y * 0.1) / 6;
  return {
    x:
      first.x +
      col * (COL_PITCH_MM[game] + colPitchDelta) +
      offset.x * 0.1 +
      topMargin * 0.1,
    y: first.y + row * (ROW_PITCH_MM[game] + rowPitchDelta) + offset.y * 0.1,
  };
}

export { GAMES };
