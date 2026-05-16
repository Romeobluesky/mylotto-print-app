import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ipc } from '@/ipc/client';
import { cn } from '@/lib/utils';

type Row = { id: string; cells: string[] };

let _rowSeq = 0;
const newRow = (): Row => ({
  id: `mr_${Date.now()}_${++_rowSeq}`,
  cells: ['', '', '', '', '', ''],
});

// 한 행 내 포커스 가능한 요소 순서: cell0..cell5, plusButton, trashButton
const PLUS_IDX = 6;
const TRASH_IDX = 7;
const LAST_IDX = TRASH_IDX;

function parseNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  if (n < 1 || n > 45) return null;
  return n;
}

// 반자동 허용: 비어있는 칸은 건너뛰되, 채워진 칸은 1~45 유효해야 하고 중복 불가.
// 모두 비어있는 행은 거부 (행 자체가 의미 없음).
function validateRow(cells: string[]): { ok: boolean; reason?: string; numbers: number[] } {
  const nums: number[] = [];
  for (const c of cells) {
    if (c.trim() === '') continue;
    const n = parseNumber(c);
    if (n === null) return { ok: false, reason: '1~45 사이 숫자만 입력', numbers: [] };
    nums.push(n);
  }
  if (nums.length === 0) return { ok: false, reason: '숫자 1개 이상 입력', numbers: [] };
  if (new Set(nums).size !== nums.length) return { ok: false, reason: '같은 숫자 중복', numbers: [] };
  return { ok: true, numbers: nums };
}

export function ManualInputView() {
  const [rows, setRows] = useState<Row[]>(() => [newRow()]);
  const [error, setError] = useState<string>('');
  // 각 행마다 input 6개 + plus button + trash button = 8개 포커스 요소
  const focusRefs = useRef<Map<string, (HTMLInputElement | HTMLButtonElement | null)[]>>(
    new Map(),
  );

  useEffect(() => {
    const first = rows[0];
    if (!first) return;
    const list = focusRefs.current.get(first.id);
    const el = list?.[0];
    if (el && el instanceof HTMLInputElement) {
      el.focus();
      el.select();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function focusAt(rowId: string, idx: number) {
    if (idx < 0 || idx > LAST_IDX) return;
    const list = focusRefs.current.get(rowId);
    const el = list?.[idx];
    if (!el) return;
    el.focus();
    if (el instanceof HTMLInputElement) el.select();
  }

  function updateCell(rowId: string, idx: number, value: string) {
    const cleaned = value.replace(/\D/g, '').slice(0, 2);
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const next = [...r.cells];
        next[idx] = cleaned;
        return { ...r, cells: next };
      }),
    );
  }

  function handleCellKeyDown(
    rowId: string,
    idx: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      focusAt(rowId, idx - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      focusAt(rowId, idx + 1);
    } else if (e.key === 'Backspace') {
      if (e.currentTarget.value === '' && idx > 0) {
        e.preventDefault();
        focusAt(rowId, idx - 1);
      }
    }
  }

  function handleButtonKeyDown(
    rowId: string,
    idx: number,
    e: React.KeyboardEvent<HTMLButtonElement>,
  ) {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      focusAt(rowId, idx - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      focusAt(rowId, idx + 1);
    }
  }

  function addRowAndFocus() {
    const created = newRow();
    setRows((prev) => [...prev, created]);
    // setState 가 적용된 다음 프레임에 새 행 첫 칸으로 포커스 이동
    setTimeout(() => focusAt(created.id, 0), 0);
  }

  function removeRow(rowId: string) {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== rowId)));
  }

  function handleConfirm() {
    const out: number[][] = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const { ok, reason, numbers } = validateRow(r.cells);
      if (!ok) {
        setError(`${i + 1}번째 행: ${reason}.`);
        return;
      }
      out.push(numbers);
    }
    void ipc.submitManualInput(out);
    void ipc.closeManualInputWindow();
  }

  function handleClose() {
    void ipc.closeManualInputWindow();
  }

  function registerRef(
    rowId: string,
    idx: number,
    el: HTMLInputElement | HTMLButtonElement | null,
  ) {
    const list = focusRefs.current.get(rowId) ?? [];
    list[idx] = el;
    focusRefs.current.set(rowId, list);
  }

  return (
    <div className="flex h-full w-full flex-col bg-background px-4 pb-3 pt-3 text-sm">
      <header className="mb-2">
        <h1 className="text-[13px] font-semibold tracking-tight">수동입력</h1>
        <ul className="mt-1 ml-4 list-disc space-y-0.5 text-[11px] leading-snug text-primary">
          <li>한 행에 1~45 사이 서로 다른 숫자를 1~6개 입력하세요.</li>
          <li>
            6개 미만은 <span className="font-semibold">반자동</span>으로 인쇄됩니다.
          </li>
          <li>
            칸 이동은 <kbd className="rounded border bg-muted px-1 text-[10px]">←</kbd>{' '}
            <kbd className="rounded border bg-muted px-1 text-[10px]">→</kbd> 방향키, 마지막 +
            버튼에서 <kbd className="rounded border bg-muted px-1 text-[10px]">Enter</kbd>를 누르면
            행이 추가됩니다.
          </li>
        </ul>
      </header>

      <ScrollArea className="flex-1 rounded-[4px] border bg-card">
        <div className="flex flex-col gap-1.5 p-3">
          {rows.map((row, rowIdx) => (
            <div key={row.id} className="flex items-center gap-1.5">
              <span className="w-9 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                {(rowIdx + 1).toString().padStart(3, '0')}
              </span>
              {row.cells.map((cell, cellIdx) => (
                <input
                  key={cellIdx}
                  ref={(el) => registerRef(row.id, cellIdx, el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={2}
                  value={cell}
                  onChange={(e) => updateCell(row.id, cellIdx, e.target.value)}
                  onKeyDown={(e) => handleCellKeyDown(row.id, cellIdx, e)}
                  onFocus={(e) => e.currentTarget.select()}
                  className={cn(
                    'h-9 w-10 rounded-[4px] border bg-background text-center font-mono text-sm tabular-nums',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  )}
                />
              ))}
              <button
                type="button"
                ref={(el) => registerRef(row.id, PLUS_IDX, el)}
                onClick={addRowAndFocus}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    addRowAndFocus();
                    return;
                  }
                  handleButtonKeyDown(row.id, PLUS_IDX, e);
                }}
                title="행 추가 (Enter)"
                className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-[4px] border bg-background hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                type="button"
                ref={(el) => registerRef(row.id, TRASH_IDX, el)}
                onClick={() => removeRow(row.id)}
                onKeyDown={(e) => handleButtonKeyDown(row.id, TRASH_IDX, e)}
                disabled={rows.length <= 1}
                title="행 삭제"
                className="inline-flex h-8 w-8 items-center justify-center rounded-[4px] border bg-background hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="mt-2 flex min-h-[16px] items-center gap-1 text-[11px] font-semibold text-primary">
        {error && <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
        <span>{error}</span>
      </div>

      <footer className="mt-1 flex items-center justify-end gap-2 border-t pt-2">
        <Button variant="outline" size="sm" onClick={handleClose} className="h-8 px-4 text-xs">
          닫기
        </Button>
        <Button variant="default" size="sm" onClick={handleConfirm} className="h-8 px-4 text-xs">
          확인
        </Button>
      </footer>
    </div>
  );
}
