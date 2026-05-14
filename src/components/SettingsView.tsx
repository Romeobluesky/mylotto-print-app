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
            로또 6/45 마킹 용지
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

          <Section title="찍히는 점 크기">
            <div className="grid grid-cols-2 gap-2">
              <LabeledNumber
                label="가로"
                value={draft.markWidth}
                onChange={(n) => patch({ markWidth: n })}
              />
              <LabeledNumber
                label="세로"
                value={draft.markHeight}
                onChange={(n) => patch({ markHeight: n })}
              />
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              현재 {(draft.markWidth / 10).toFixed(1)}mm × {(draft.markHeight / 10).toFixed(1)}mm
              · 숫자 1 = 0.1mm. 너무 작으면 인식 안 되고, 너무 크면 옆 칸 침범.
            </p>
          </Section>

          <Section
            title="각 게임 위치 조정"
            action={
              <button
                type="button"
                onClick={resetOffsets}
                className="rounded-[4px] border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-accent hover:text-foreground"
                title="모든 게임의 위치 조정값을 0 으로 초기화"
              >
                초기화
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
            <p className="mt-1 text-[10px] text-muted-foreground">
              한 게임 전체가 통째로 어긋났을 때 사용. 가로(X) · 세로(Y) 0.1mm 단위.
              ‘+’ 는 오른쪽/아래, ‘−’ 는 왼쪽/위.
            </p>
          </Section>

          <Section
            title="각 게임 간격 미세 조정"
            action={
              <button
                type="button"
                onClick={resetPitch}
                className="rounded-[4px] border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-accent hover:text-foreground"
                title="모든 게임의 간격 조정값을 0 으로 초기화"
              >
                초기화
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
              첫 번호(1)는 맞는데 끝 번호(7·43·45)로 갈수록 점점 어긋날 때 사용.
              X 는 7번 열(가장 오른쪽), Y 는 7번 행(가장 아래)만 0.1mm 씩 이동, 중간 번호는 비례.
            </p>
          </Section>

          <Section title="용지 길이 (긴 쪽)">
            <div className="grid grid-cols-[28px_1fr] items-center gap-1.5">
              <Label className="text-[11px] text-muted-foreground">길이</Label>
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
              현재 {(draft.paperHeight / 10).toFixed(1)}mm. 여러 장 연속 인쇄 시 위치가 점점
              밀린다면 0.1mm 씩 조정 (보통 ±1~3 이면 충분).
            </p>
          </Section>

          <Section title="전체 마크 위치 보정 (공통)">
            <div className="grid grid-cols-[28px_1fr] items-center gap-1.5">
              <Label className="text-[11px] text-muted-foreground">위치</Label>
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
            <p className="mt-1 text-[10px] text-muted-foreground">
              5개 게임 전부 같은 방향으로 통째로 어긋났을 때 사용. ‘+’ 누르면 미리보기에서
              오른쪽 (실제 종이 출력 시 위쪽), ‘−’ 누르면 반대.
            </p>
          </Section>

          <Section title="자동/반자동 표시 위치">
            <div className="grid grid-cols-[28px_1fr] items-center gap-1.5">
              <Label className="text-[11px] text-muted-foreground">세로</Label>
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
              각 게임 끝쪽의 ‘자동/반자동’ 칸 세로 위치. 가로는 자동 정렬되므로 손볼 필요 없음.
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
            왼쪽에서 게임 위에 마우스를 올리면 해당 게임만 진하게 표시됩니다
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
          <span>회색 점 = 실제 인쇄될 마크 위치</span>
          <span>모든 칸이 표시됩니다 — 실제 인쇄는 선택된 번호만</span>
        </div>

        {/* 도움말 / 참고 — 미리보기 아래 공간 활용 */}
        <HelpPanel />
      </main>
    </div>
  );
}

function HelpPanel() {
  return (
    <div className="mt-4 space-y-3">
      <HelpCard title="처음 사용한다면" tone="default">
        <ol className="ml-3 list-decimal space-y-1 text-[11px] leading-relaxed">
          <li>아래 <strong className="text-foreground">‘시험 인쇄’</strong> 를 눌러 1장 출력.</li>
          <li>실제 OMR 용지에 검은 점이 셀(타원) 안에 정확히 들어갔는지 확인.</li>
          <li>어긋났다면 아래 시나리오를 참고해 미세 조정 → 다시 시험 인쇄.</li>
          <li>맞으면 <strong className="text-foreground">‘저장’</strong> — 이후 모든 인쇄에 자동 적용.</li>
        </ol>
      </HelpCard>

      <HelpCard title="자주 발생하는 문제 해결" tone="warning">
        <dl className="space-y-2 text-[11px] leading-relaxed">
          <div>
            <dt className="font-semibold text-foreground">5개 게임 전부 같은 방향으로 어긋났다</dt>
            <dd className="ml-1 text-muted-foreground">→ <strong>전체 마크 위치 보정</strong> 으로 한꺼번에 이동.</dd>
          </div>
          <div>
            <dt className="font-semibold text-foreground">한 게임(예: D)만 어긋났다</dt>
            <dd className="ml-1 text-muted-foreground">→ <strong>각 게임 위치 조정</strong> 의 해당 게임만 ±1 씩 조정.</dd>
          </div>
          <div>
            <dt className="font-semibold text-foreground">1번은 맞는데 끝 번호(7·43·45)로 갈수록 어긋난다</dt>
            <dd className="ml-1 text-muted-foreground">→ <strong>각 게임 간격 미세 조정</strong> 으로 끝 번호만 이동.</dd>
          </div>
          <div>
            <dt className="font-semibold text-foreground">5장 연속 인쇄 시 5장째 위치가 점점 밀린다</dt>
            <dd className="ml-1 text-muted-foreground">→ <strong>용지 길이</strong> 를 ±1 씩 조정 (보통 1~3 회로 해결).</dd>
          </div>
        </dl>
      </HelpCard>

      <HelpCard title="조정값 의미 한눈에" tone="default">
        <ul className="ml-3 list-disc space-y-1 text-[11px] leading-relaxed">
          <li>모든 숫자 입력의 단위는 <strong className="text-foreground">0.1mm</strong> (값 1 = 0.1mm).</li>
          <li><strong>+</strong> = 오른쪽/아래로, <strong>−</strong> = 왼쪽/위로 (미리보기 기준).</li>
          <li>두꺼운 종이 뭉치(30장 이상)는 픽업이 흔들려 위치가 들쭉날쭉할 수 있음 — 10~15장씩 나눠 인쇄 권장.</li>
        </ul>
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
