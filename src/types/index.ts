export const GAMES = ['A', 'B', 'C', 'D', 'E'] as const;
export type GameId = (typeof GAMES)[number];

export interface Offset {
  x: number;
  y: number;
}

export type Offsets = Record<GameId, Offset>;

export interface AppSettings {
  printer: string;
  offsets: Offsets;
  /**
   * 게임별 셀 피치 보정 (0.1mm 단위, 마지막 셀 시프트 기준).
   * `x`: col 7 이 col 1 대비 추가로 시프트할 거리 (전체에 1/6 분배해 col-pitch 에 반영).
   * `y`: row 7 이 row 1 대비 추가로 시프트할 거리 (전체에 1/6 분배해 row-pitch 에 반영).
   * `offsets` 가 게임 전체를 평행 이동시키는 반면, 이 값은 셀 간 간격(피치) 을 조정 —
   * 게임 내 셀 간 누적 드리프트(예: col 1 은 맞는데 col 7 만 어긋날 때) 보정용.
   */
  pitchOffsets: Offsets;
  /** 마킹 폭 (0.1mm) — 가로 길이. e.g. 20 = 2.0mm */
  markWidth: number;
  /** 마킹 높이 (0.1mm) — 세로 길이. e.g. 36 = 3.6mm */
  markHeight: number;
  /** 자동/반자동 체크박스 Y 좌표 (0.1mm) — 절대값 (페이지 상단 기준). X 는 각 게임 마지막 마킹 열에 자동 정렬. */
  checkboxOffsetY: number;
  /**
   * 상단 여백 (0.1mm) — paper view 기준 로고 아래쪽 padding.
   * 모든 마크(셀·체크박스 포함)를 이 값만큼 paper view 아래쪽으로 시프트한다.
   * 음수값도 허용 — 마크를 위쪽으로 시프트하여 leading-edge 쪽에 가깝게 인쇄.
   */
  topMargin: number;
  /**
   * 인쇄 용지 세로 길이 (0.1mm). 기본 1900 = 190.0mm.
   * 실제 OMR 용지가 ±0.5mm 다른 경우 사용자가 실측치로 보정.
   * 페이지마다 잘리는 위치가 정확히 맞아야 다중 인쇄 시 누적 오차가 0 이 됨.
   */
  paperHeight: number;
}

export interface PrinterInfo {
  name: string;
  displayName: string;
  isDefault: boolean;
}

export interface PrintResult {
  success: boolean;
  error?: string;
}

export interface OpenFileResult {
  canceled: boolean;
  filePath?: string;
  combinations: number[][];
  invalidLineCount: number;
}

export interface PrintPayload {
  combinations: number[][];
  settings: AppSettings;
}

export interface TestPrintPayload {
  settings: AppSettings;
}

export const DEFAULT_SETTINGS: AppSettings = {
  printer: '',
  offsets: {
    A: { x: 0, y: 0 },
    B: { x: 0, y: 0 },
    C: { x: 0, y: 0 },
    D: { x: 0, y: 0 },
    E: { x: 0, y: 0 },
  },
  pitchOffsets: {
    A: { x: 0, y: 0 },
    B: { x: 0, y: 0 },
    C: { x: 0, y: 0 },
    D: { x: 0, y: 0 },
    E: { x: 0, y: 0 },
  },
  markWidth: 20,
  markHeight: 36,
  checkboxOffsetY: 700, // PRD §5.4: landscape 상단 기준 70.0mm. X 는 각 게임 col 7 에 자동 정렬.
  topMargin: 0,         // 사용자가 시험인쇄 후 0.1mm 단위로 조정 (음수 허용)
  paperHeight: 1900,    // 190.0mm — 실측 보정 시 0.1mm 단위로 조정
};

export interface ApiBridge {
  openFile: () => Promise<OpenFileResult>;
  listPrinters: () => Promise<PrinterInfo[]>;
  print: (payload: PrintPayload) => Promise<PrintResult>;
  testPrint: (payload: TestPrintPayload) => Promise<PrintResult>;
  getSettings: () => Promise<AppSettings>;
  setSettings: (settings: AppSettings) => Promise<void>;
  openSettingsWindow: () => Promise<void>;
  closeSettingsWindow: () => Promise<void>;
  onSettingsChanged: (callback: (settings: AppSettings) => void) => () => void;
  openManualInputWindow: () => Promise<void>;
  closeManualInputWindow: () => Promise<void>;
  submitManualInput: (groups: number[][]) => Promise<void>;
  onManualInputSubmit: (callback: (groups: number[][]) => void) => () => void;
}

declare global {
  interface Window {
    api: ApiBridge;
  }
}
