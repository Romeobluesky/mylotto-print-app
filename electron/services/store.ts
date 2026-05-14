import Store from 'electron-store';
import { DEFAULT_SETTINGS, type AppSettings, type GameId, type Offset } from '@shared/index';

const schema: Store.Schema<AppSettings> = {
  printer: { type: 'string', default: '' },
  offsets: {
    type: 'object',
    default: DEFAULT_SETTINGS.offsets,
    properties: {
      A: { type: 'object' },
      B: { type: 'object' },
      C: { type: 'object' },
      D: { type: 'object' },
      E: { type: 'object' },
    },
  },
  pitchOffsets: {
    type: 'object',
    default: DEFAULT_SETTINGS.pitchOffsets,
    properties: {
      A: { type: 'object' },
      B: { type: 'object' },
      C: { type: 'object' },
      D: { type: 'object' },
      E: { type: 'object' },
    },
  },
  markWidth: { type: 'number', default: DEFAULT_SETTINGS.markWidth, minimum: 1, maximum: 200 },
  markHeight: { type: 'number', default: DEFAULT_SETTINGS.markHeight, minimum: 1, maximum: 200 },
  checkboxOffsetY: {
    type: 'number',
    default: DEFAULT_SETTINGS.checkboxOffsetY,
    minimum: 0,
    maximum: 1000,
  },
  topMargin: {
    type: 'number',
    default: DEFAULT_SETTINGS.topMargin,
    minimum: -500,
    maximum: 500,
  },
  paperHeight: {
    type: 'number',
    default: DEFAULT_SETTINGS.paperHeight,
    minimum: 1000, // 100.0mm
    maximum: 3000, // 300.0mm
  },
};

const store = new Store<AppSettings>({
  name: 'config',
  defaults: DEFAULT_SETTINGS,
  schema,
});

// 구버전(markSize 단일값) 호환: 한 번 마이그레이트
const legacyStore = store as unknown as {
  has(key: string): boolean;
  get(key: string): unknown;
  delete(key: string): void;
};
if (legacyStore.has('markSize')) {
  const legacy = legacyStore.get('markSize');
  if (typeof legacy === 'number' && legacy > 0) {
    store.set('markWidth', clamp(legacy, 1, 200));
    store.set('markHeight', clamp(legacy * 2, 1, 200));
  }
  legacyStore.delete('markSize');
}

// 마이그레이션:
// - paperLength 키 잔재 제거 (이전 하드코딩 시기 잔재)
// - paperHeight 미주입 시 기본값 1900(190.0mm) 주입
// - checkboxOffsetX 키 제거 (X 는 각 게임 col 7 에 자동 정렬되어 별도 설정 불필요)
// - pitchOffsets 미주입 시 기본값 (모두 0) 주입
const SETTINGS_VERSION = 'pitch-offsets-2026-05-14';
const versionStore = store as unknown as {
  has(key: string): boolean;
  get(key: string): unknown;
  set(key: string, val: unknown): void;
  delete(key: string): void;
};
if (versionStore.get('configVersion') !== SETTINGS_VERSION) {
  if (versionStore.has('paperLength')) {
    versionStore.delete('paperLength');
  }
  if (!versionStore.has('paperHeight')) {
    versionStore.set('paperHeight', DEFAULT_SETTINGS.paperHeight);
  }
  if (versionStore.has('checkboxOffsetX')) {
    versionStore.delete('checkboxOffsetX');
  }
  if (!versionStore.has('pitchOffsets')) {
    versionStore.set('pitchOffsets', DEFAULT_SETTINGS.pitchOffsets);
  }
  versionStore.set('configVersion', SETTINGS_VERSION);
}

export function getAllSettings(): AppSettings {
  return {
    printer: store.get('printer'),
    offsets: store.get('offsets'),
    pitchOffsets: store.get('pitchOffsets') ?? DEFAULT_SETTINGS.pitchOffsets,
    markWidth: store.get('markWidth'),
    markHeight: store.get('markHeight'),
    checkboxOffsetY: store.get('checkboxOffsetY'),
    topMargin: store.get('topMargin'),
    paperHeight: store.get('paperHeight'),
  };
}

export function setAllSettings(settings: AppSettings): void {
  store.set('printer', settings.printer);
  store.set('offsets', sanitizeOffsets(settings.offsets));
  store.set('pitchOffsets', sanitizeOffsets(settings.pitchOffsets));
  store.set('markWidth', clamp(settings.markWidth, 1, 200));
  store.set('markHeight', clamp(settings.markHeight, 1, 200));
  store.set('checkboxOffsetY', clamp(settings.checkboxOffsetY, 0, 1000));
  store.set('topMargin', clamp(settings.topMargin, -500, 500));
  store.set('paperHeight', clamp(settings.paperHeight, 1000, 3000));
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function sanitizeOffsets(input: AppSettings['offsets']): AppSettings['offsets'] {
  const out: Partial<Record<GameId, Offset>> = {};
  (['A', 'B', 'C', 'D', 'E'] as GameId[]).forEach((g) => {
    const raw = input?.[g] ?? { x: 0, y: 0 };
    out[g] = {
      x: Number.isFinite(raw.x) ? Math.round(raw.x) : 0,
      y: Number.isFinite(raw.y) ? Math.round(raw.y) : 0,
    };
  });
  return out as AppSettings['offsets'];
}
