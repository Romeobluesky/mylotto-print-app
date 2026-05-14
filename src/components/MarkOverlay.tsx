import { useMemo } from 'react';
import type { AppSettings } from '@shared/index';
import {
  GAMES,
  PAGE_MM,
  PREVIEW_TOPMARGIN_BASELINE,
  PREVIEW_X_SHIFT_MM,
  autoCheckboxPosition,
  cellPosition,
  semiAutoCheckboxPosition,
} from '@shared/coordinates';

interface Props {
  settings: AppSettings;
  /** 강조 표시할 게임 (선택 시 진하게). null이면 전체 동일 강도 */
  focusGame?: 'A' | 'B' | 'C' | 'D' | 'E' | null;
}

interface Mark {
  key: string;
  game: string;
  /** landscape 중심 좌표 (mm) */
  cx: number;
  cy: number;
}

// SVG <rect> 로 렌더링 — CSS % 단위는 부동소수점 위치에서
// sub-pixel anti-aliasing 이 마크마다 달라져 "사이즈가 변하면서 움직이는" 듯한
// 시각적 버그를 일으킨다. SVG viewBox 좌표(mm) 기준이면 모든 마크의 width/height 가
// 동일한 vector 단위로 처리되어 위치에 무관하게 항상 같은 크기로 라스터화됨.
export function MarkOverlay({ settings, focusGame = null }: Props) {
  const marks = useMemo(() => buildMarks(settings), [settings]);
  const widthMm = settings.markWidth / 10;
  const heightMm = settings.markHeight / 10;

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox={`0 0 ${PAGE_MM.width} ${PAGE_MM.height}`}
      preserveAspectRatio="none"
    >
      {marks.map((m) => {
        const dim = focusGame !== null && m.game !== focusGame;
        return (
          <rect
            key={m.key}
            x={m.cx - widthMm / 2}
            y={m.cy - heightMm / 2}
            width={widthMm}
            height={heightMm}
            fill={dim ? '#1e293b' : '#0f172a'}
            fillOpacity={dim ? 0.35 : 0.85}
          />
        );
      })}
    </svg>
  );
}

function buildMarks(settings: AppSettings): Mark[] {
  const out: Mark[] = [];
  const previewX = (x: number) => x + PREVIEW_X_SHIFT_MM;
  // 미리보기 시각 보정: 실제 인쇄용 baseline 만큼 빼서 마크가 OMR 셀 안에 떨어지도록.
  const tm = settings.topMargin - PREVIEW_TOPMARGIN_BASELINE;
  for (const g of GAMES) {
    const offset = settings.offsets[g];
    const pitch = settings.pitchOffsets[g];
    for (let n = 1; n <= 45; n++) {
      const pos = cellPosition(g, n, offset, tm, pitch);
      out.push({ key: `${g}-${n}`, game: g, cx: previewX(pos.x), cy: pos.y });
    }
    const auto = autoCheckboxPosition(g, offset, settings.checkboxOffsetY, tm, pitch);
    out.push({ key: `${g}-auto`, game: g, cx: previewX(auto.x), cy: auto.y });
    const semi = semiAutoCheckboxPosition(g, offset, settings.checkboxOffsetY, tm, pitch);
    out.push({ key: `${g}-semi`, game: g, cx: previewX(semi.x), cy: semi.y });
  }
  return out;
}
