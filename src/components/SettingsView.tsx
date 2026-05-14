import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSettings } from '@/hooks/useSettings';
import { ipc } from '@/ipc/client';
import { GAMES, type AppSettings, type GameId, type PrinterInfo } from '@shared/index';
import { MarkOverlay } from './MarkOverlay';
import omrCardUrl from '@/assets/lotto-omr-card.png';
import { cn } from '@/lib/utils';

const PAPER_ASPECT = 190 / 83;

export function SettingsView() {
  const { settings, save, loaded } = useSettings();
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [dirty, setDirty] = useState(false);
  const [printers, setPrinters] = useState<PrinterInfo[]>([]);
  const [loadingPrinters, setLoadingPrinters] = useState(false);
  const [busy, setBusy] = useState<'idle' | 'testing' | 'saving'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [focusGame, setFocusGame] = useState<GameId | null>(null);

  useEffect(() => {
    if (loaded) setDraft(settings);
  }, [loaded, settings]);

  useEffect(() => {
    void loadPrinters();
  }, []);

  async function loadPrinters() {
    setLoadingPrinters(true);
    try {
      const list = await ipc.listPrinters();
      setPrinters(list);
      setDraft((d) => {
        if (d.printer) return d;
        const def = list.find((p) => p.isDefault) ?? list[0];
        return def ? { ...d, printer: def.name } : d;
      });
    } finally {
      setLoadingPrinters(false);
    }
  }

  function patch(next: Partial<AppSettings>) {
    setDraft((d) => ({ ...d, ...next }));
    setDirty(true);
    setMessage(null);
  }

  function updateOffset(game: GameId, axis: 'x' | 'y', raw: string) {
    const n = raw === '' || raw === '-' ? 0 : parseInt(raw, 10);
    if (Number.isNaN(n)) return;
    setDraft((d) => ({
      ...d,
      offsets: { ...d.offsets, [game]: { ...d.offsets[game], [axis]: n } },
    }));
    setDirty(true);
    setMessage(null);
  }

  function nudge(game: GameId, axis: 'x' | 'y', delta: number) {
    setDraft((d) => ({
      ...d,
      offsets: {
        ...d.offsets,
        [game]: { ...d.offsets[game], [axis]: d.offsets[game][axis] + delta },
      },
    }));
    setDirty(true);
    setMessage(null);
  }

  function resetOffsets() {
    setDraft((d) => ({
      ...d,
      offsets: {
        A: { x: 0, y: 0 },
        B: { x: 0, y: 0 },
        C: { x: 0, y: 0 },
        D: { x: 0, y: 0 },
        E: { x: 0, y: 0 },
      },
    }));
    setDirty(true);
    setMessage(null);
  }

  function updatePitch(game: GameId, axis: 'x' | 'y', raw: string) {
    const n = raw === '' || raw === '-' ? 0 : parseInt(raw, 10);
    if (Number.isNaN(n)) return;
    setDraft((d) => ({
      ...d,
      pitchOffsets: {
        ...d.pitchOffsets,
        [game]: { ...d.pitchOffsets[game], [axis]: n },
      },
    }));
    setDirty(true);
    setMessage(null);
  }

  function nudgePitch(game: GameId, axis: 'x' | 'y', delta: number) {
    setDraft((d) => ({
      ...d,
      pitchOffsets: {
        ...d.pitchOffsets,
        [game]: {
          ...d.pitchOffsets[game],
          [axis]: d.pitchOffsets[game][axis] + delta,
        },
      },
    }));
    setDirty(true);
    setMessage(null);
  }

  function resetPitch() {
    setDraft((d) => ({
      ...d,
      pitchOffsets: {
        A: { x: 0, y: 0 },
        B: { x: 0, y: 0 },
        C: { x: 0, y: 0 },
        D: { x: 0, y: 0 },
        E: { x: 0, y: 0 },
      },
    }));
    setDirty(true);
    setMessage(null);
  }

  async function handleTest() {
    setBusy('testing');
    setMessage(null);
    try {
      const res = await ipc.testPrint({ settings: draft });
      setMessage(res.success ? '시험 인쇄 전송 완료' : `시험 인쇄 실패: ${res.error}`);
    } finally {
      setBusy('idle');
    }
  }

  async function handleSave() {
    setBusy('saving');
    try {
      await save(draft);
      setDirty(false);
      setMessage('저장됨');
    } finally {
      setBusy('idle');
    }
  }

  function handleClose() {
    void ipc.closeSettingsWindow();
  }

  if (!loaded) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
        설정 로딩 중...
      </div>
    );
  }

  return (
    <div className="flex h-full w-full bg-background text-sm">
      {/* 좌측 사이드 패널 */}
      <aside className="flex h-full w-[300px] shrink-0 flex-col border-r bg-card">
        <div className="border-b px-4 py-2.5">
          <h1 className="text-[13px] font-semibold tracking-tight">인쇄 설정</h1>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            OMR 6/45 · 190mm × 83mm
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          <Section title="프린터">
            <Select value={draft.printer} onValueChange={(v) => patch({ printer: v })}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue
                  placeholder={loadingPrinters ? '불러오는 중...' : '프린터를 선택하세요'}
                />
              </SelectTrigger>
              <SelectContent>
                {printers.map((p) => (
                  <SelectItem key={p.name} value={p.name} className="text-xs">
                    {p.displayName}
                    {p.isDefault ? ' (기본)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Section>

          <Section title="마킹 치수 (0.1mm)">
            <div className="grid grid-cols-2 gap-2">
              <LabeledNumber
                label="폭"
                value={draft.markWidth}
                onChange={(n) => patch({ markWidth: n })}
              />
              <LabeledNumber
                label="높이"
                value={draft.markHeight}
                onChange={(n) => patch({ markHeight: n })}
              />
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {(draft.markWidth / 10).toFixed(1)}mm × {(draft.markHeight / 10).toFixed(1)}mm
            </p>
          </Section>

          <Section
            title="게임별 오프셋 (0.1mm)"
            action={
              <button
                type="button"
                onClick={resetOffsets}
                className="rounded-[4px] border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-accent hover:text-foreground"
                title="모든 게임의 X/Y 오프셋을 0 으로 초기화"
              >
                리셋
              </button>
            }
          >
            <div className="grid gap-1">
              {GAMES.map((g) => (
                <GameOffsetRow
                  key={g}
                  game={g}
                  x={draft.offsets[g].x}
                  y={draft.offsets[g].y}
                  active={focusGame === g}
                  onHover={(on) => setFocusGame(on ? g : null)}
                  onChangeX={(v) => updateOffset(g, 'x', v)}
                  onChangeY={(v) => updateOffset(g, 'y', v)}
                  onNudgeX={(d) => nudge(g, 'x', d)}
                  onNudgeY={(d) => nudge(g, 'y', d)}
                />
              ))}
            </div>
          </Section>

          <Section
            title="셀 피치 보정 (0.1mm · 마지막 셀 시프트)"
            action={
              <button
                type="button"
                onClick={resetPitch}
                className="rounded-[4px] border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-accent hover:text-foreground"
                title="모든 게임의 피치 보정을 0 으로 초기화"
              >
                리셋
              </button>
            }
          >
            <div className="grid gap-1">
              {GAMES.map((g) => (
                <GameOffsetRow
                  key={g}
                  game={g}
                  x={draft.pitchOffsets[g].x}
                  y={draft.pitchOffsets[g].y}
                  active={focusGame === g}
                  onHover={(on) => setFocusGame(on ? g : null)}
                  onChangeX={(v) => updatePitch(g, 'x', v)}
                  onChangeY={(v) => updatePitch(g, 'y', v)}
                  onNudgeX={(d) => nudgePitch(g, 'x', d)}
                  onNudgeY={(d) => nudgePitch(g, 'y', d)}
                />
              ))}
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              X = col 7 시프트 · Y = row 7 시프트. 1/6 분배되어 셀 간격에 가산 — col 1·row 1 고정, 안쪽 셀은 비례 이동.
            </p>
          </Section>

          <Section title="용지 가로 길이 (0.1mm)">
            <div className="grid grid-cols-[28px_1fr] items-center gap-1.5">
              <Label className="text-[11px] text-muted-foreground">H</Label>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => patch({ paperHeight: Math.max(1000, draft.paperHeight - 1) })}
                  className="flex h-6 w-6 items-center justify-center rounded-[4px] border bg-background text-[11px] text-foreground hover:bg-accent"
                  tabIndex={-1}
                  title="-0.1mm"
                >
                  −
                </button>
                <Input
                  type="number"
                  step={1}
                  min={1000}
                  max={3000}
                  value={draft.paperHeight}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10);
                    if (!Number.isNaN(n)) patch({ paperHeight: n });
                  }}
                  className="h-6 min-w-0 flex-1 px-1 text-center text-xs"
                />
                <button
                  type="button"
                  onClick={() => patch({ paperHeight: Math.min(3000, draft.paperHeight + 1) })}
                  className="flex h-6 w-6 items-center justify-center rounded-[4px] border bg-background text-[11px] text-foreground hover:bg-accent"
                  tabIndex={-1}
                  title="+0.1mm"
                >
                  +
                </button>
              </div>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {(draft.paperHeight / 10).toFixed(1)}mm — 실측 OMR 용지 가로 길이로 보정 (다중 인쇄 시 누적 오차 차단)
            </p>
          </Section>

          <Section title="왼쪽 여백 (0.1mm, ± 허용)">
            <div className="grid grid-cols-[28px_1fr] items-center gap-1.5">
              <Label className="text-[11px] text-muted-foreground">X</Label>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => patch({ topMargin: Math.max(-500, draft.topMargin - 10) })}
                  className="flex h-6 w-6 items-center justify-center rounded-[4px] border bg-background text-[11px] text-foreground hover:bg-accent"
                  tabIndex={-1}
                  title="-1mm"
                >
                  −
                </button>
                <Input
                  type="number"
                  step={1}
                  min={-500}
                  max={500}
                  value={draft.topMargin}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10);
                    if (!Number.isNaN(n)) patch({ topMargin: n });
                  }}
                  className="h-6 min-w-0 flex-1 px-1 text-center text-xs"
                />
                <button
                  type="button"
                  onClick={() => patch({ topMargin: Math.min(500, draft.topMargin + 10) })}
                  className="flex h-6 w-6 items-center justify-center rounded-[4px] border bg-background text-[11px] text-foreground hover:bg-accent"
                  tabIndex={-1}
                  title="+1mm"
                >
                  +
                </button>
              </div>
            </div>
          </Section>

          <Section title="자동/반자동 체크박스 Y (0.1mm)">
            <div className="grid grid-cols-[28px_1fr] items-center gap-1.5">
              <Label className="text-[11px] text-muted-foreground">Y</Label>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => patch({ checkboxOffsetY: draft.checkboxOffsetY - 1 })}
                  className="flex h-6 w-6 items-center justify-center rounded-[4px] border bg-background text-[11px] text-foreground hover:bg-accent"
                  tabIndex={-1}
                >
                  −
                </button>
                <Input
                  type="number"
                  step={1}
                  value={draft.checkboxOffsetY}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10);
                    if (!Number.isNaN(n)) patch({ checkboxOffsetY: n });
                  }}
                  className="h-6 min-w-0 flex-1 px-1 text-center text-xs"
                />
                <button
                  type="button"
                  onClick={() => patch({ checkboxOffsetY: draft.checkboxOffsetY + 1 })}
                  className="flex h-6 w-6 items-center justify-center rounded-[4px] border bg-background text-[11px] text-foreground hover:bg-accent"
                  tabIndex={-1}
                >
                  +
                </button>
              </div>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              X 는 각 게임의 마지막 마킹 열에 자동 정렬 · Y 는 페이지 상단부터 절대 위치
            </p>
          </Section>
        </div>

        {/* 하단 액션 */}
        <div className="border-t bg-card px-4 py-2.5">
          <div
            className={cn(
              'mb-2 truncate rounded-[4px] px-2 py-1 text-[10.5px]',
              message
                ? 'bg-muted text-foreground'
                : dirty
                  ? 'bg-amber-500/15 text-amber-300'
                  : 'bg-emerald-500/15 text-emerald-300',
            )}
          >
            {message ?? (dirty ? '변경 사항 — 저장 필요' : '저장됨')}
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={busy !== 'idle' || !draft.printer}
              className="h-7 px-0 text-xs"
            >
              {busy === 'testing' ? '전송중' : '시험 인쇄'}
            </Button>
            <Button
              variant="default"
              onClick={handleSave}
              disabled={busy !== 'idle' || !dirty}
              className="h-7 px-0 text-xs"
            >
              {busy === 'saving' ? '저장중' : '저장'}
            </Button>
            <Button variant="ghost" onClick={handleClose} className="h-7 px-0 text-xs">
              닫기
            </Button>
          </div>
        </div>
      </aside>

      {/* 우측 프리뷰 */}
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto p-4">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-[12px] font-medium text-foreground">미리보기</h2>
          <span className="text-[10px] text-muted-foreground">
            마우스를 사이드바 게임 위에 두면 해당 게임만 강조됩니다
          </span>
        </div>
        <div
          className="relative w-full shrink-0 overflow-hidden rounded-[4px] border bg-white shadow-sm"
          style={{ aspectRatio: PAPER_ASPECT }}
        >
          <img
            src={omrCardUrl}
            alt="실측 OMR 6/45"
            className="absolute inset-0 h-full w-full select-none object-contain"
            draggable={false}
          />
          <MarkOverlay settings={draft} focusGame={focusGame} />
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>좌표: 실측 스캔 best-fit (게임별)</span>
          <span>셀 간격 가로 3.408~3.421mm · 세로 6.360~6.384mm</span>
        </div>

        {/* 도움말 / 참고 — 미리보기 아래 공간 활용 */}
        <HelpPanel />
      </main>
    </div>
  );
}

function HelpPanel() {
  return (
    <div className="mt-4">
      <HelpCard title="다중 인쇄 시 위치가 어긋날 때" tone="warning">
        <ol className="ml-3 list-decimal space-y-1 text-[11px] leading-relaxed">
          <li>먼저 1장 시험 인쇄 — 위치가 맞는지 확인.</li>
          <li>5장 연속 인쇄 — 5장째가 1장째와 같은 위치인지 확인.</li>
          <li>밀린다면 <strong className="text-foreground">용지 가로 길이</strong>를 <span className="font-mono">+1</span>(0.1mm)씩 늘려봅니다.</li>
          <li>위로 밀린다면 반대로 <span className="font-mono">−1</span>씩 줄여봅니다.</li>
          <li>1~2회 시도로 0 오차 도달 — 한번 맞추면 영구 보존됩니다.</li>
        </ol>
      </HelpCard>
    </div>
  );
}

function HelpCard({
  title,
  tone,
  children,
}: {
  title: string;
  tone: 'default' | 'warning';
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        'rounded-[4px] border bg-card p-3 shadow-sm',
        tone === 'warning' && 'border-amber-500/40 bg-amber-500/5',
      )}
    >
      <h3
        className={cn(
          'mb-1.5 text-[11px] font-semibold uppercase tracking-wider',
          tone === 'warning' ? 'text-amber-300' : 'text-muted-foreground',
        )}
      >
        {title}
      </h3>
      <div className="text-[11px] text-foreground/85">{children}</div>
    </section>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-4 last:mb-0">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[10.5px] font-bold uppercase tracking-wider text-foreground">
          {title}
        </span>
        {action}
      </div>
      {children}
    </section>
  );
}

interface LabeledNumberProps {
  label: string;
  value: number;
  onChange: (n: number) => void;
}

function LabeledNumber({ label, value, onChange }: LabeledNumberProps) {
  return (
    <div className="grid grid-cols-[28px_1fr] items-center gap-1">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, value - 1))}
          className="flex h-6 w-6 items-center justify-center rounded-[4px] border bg-background text-[11px] text-foreground hover:bg-accent"
          tabIndex={-1}
        >
          −
        </button>
        <Input
          type="number"
          min={1}
          max={200}
          step={1}
          value={value}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            if (!Number.isNaN(n)) onChange(n);
          }}
          className="h-6 min-w-0 flex-1 px-1 text-center text-xs"
        />
        <button
          type="button"
          onClick={() => onChange(Math.min(200, value + 1))}
          className="flex h-6 w-6 items-center justify-center rounded-[4px] border bg-background text-[11px] text-foreground hover:bg-accent"
          tabIndex={-1}
        >
          +
        </button>
      </div>
    </div>
  );
}

interface GameOffsetRowProps {
  game: GameId;
  x: number;
  y: number;
  active: boolean;
  onHover: (on: boolean) => void;
  onChangeX: (raw: string) => void;
  onChangeY: (raw: string) => void;
  onNudgeX: (delta: number) => void;
  onNudgeY: (delta: number) => void;
}

function GameOffsetRow({
  game,
  x,
  y,
  active,
  onHover,
  onChangeX,
  onChangeY,
  onNudgeX,
  onNudgeY,
}: GameOffsetRowProps) {
  return (
    <div
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      className={cn(
        'grid grid-cols-[20px_1fr_1fr] items-center gap-1.5 rounded-[4px] border px-1.5 py-1 transition-colors',
        active ? 'border-primary/60 bg-primary/10' : 'border-transparent hover:bg-accent/40',
      )}
    >
      <span className={cn('text-center text-[11px] font-semibold', active ? 'text-primary' : 'text-foreground')}>
        {game}
      </span>
      <NudgeInput label="X" value={x} onChange={onChangeX} onNudge={onNudgeX} />
      <NudgeInput label="Y" value={y} onChange={onChangeY} onNudge={onNudgeY} />
    </div>
  );
}

interface NudgeInputProps {
  label: string;
  value: number;
  onChange: (raw: string) => void;
  onNudge: (delta: number) => void;
}

function NudgeInput({ label, value, onChange, onNudge }: NudgeInputProps) {
  return (
    <div className="flex items-center gap-0.5">
      <span className="w-3 text-[10px] text-muted-foreground">{label}</span>
      <button
        type="button"
        onClick={() => onNudge(-1)}
        className="flex h-5 w-5 items-center justify-center rounded-[4px] border bg-background text-[11px] text-muted-foreground hover:bg-accent"
        tabIndex={-1}
      >
        −
      </button>
      <Input
        type="number"
        step={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-5 min-w-0 flex-1 px-1 text-center text-[11px]"
      />
      <button
        type="button"
        onClick={() => onNudge(1)}
        className="flex h-5 w-5 items-center justify-center rounded-[4px] border bg-background text-[11px] text-muted-foreground hover:bg-accent"
        tabIndex={-1}
      >
        +
      </button>
    </div>
  );
}
