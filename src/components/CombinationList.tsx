import { useEffect, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { CombinationItem } from '@/hooks/useCombinations';

interface Props {
  items: CombinationItem[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onSetSelected: (ids: string[], checked: boolean) => void;
}

const GROUP_SIZE = 5;
const MANUAL_KEY = 'M';

function formatNumbers(nums: number[]): string {
  return nums.map((n) => n.toString().padStart(2, '0')).join(' ');
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

interface RowProps {
  item: CombinationItem;
  rowIdx: number;
  checked: boolean;
  isHighlighted: boolean;
  onToggle: (id: string) => void;
}

function Row({ item, rowIdx, checked, isHighlighted, onToggle }: RowProps) {
  return (
    <div
      onClick={() => onToggle(item.id)}
      className={cn(
        'flex cursor-pointer items-center gap-2 px-2 py-1 text-[12px] leading-none hover:bg-accent/40',
        checked && 'bg-accent/60',
        isHighlighted && 'bg-primary/15 hover:bg-primary/20',
        isHighlighted && checked && 'bg-primary/25',
      )}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={() => onToggle(item.id)}
        onClick={(e) => e.stopPropagation()}
        className="h-3.5 w-3.5"
        aria-label={`row-${rowIdx + 1}-select`}
      />
      <span className="w-7 shrink-0 text-right text-muted-foreground tabular-nums">
        {(rowIdx + 1).toString().padStart(3, '0')}
      </span>
      <span className="font-mono text-foreground tabular-nums tracking-wider">
        {formatNumbers(item.numbers)}
      </span>
    </div>
  );
}

interface BadgeProps {
  label: string;
  isHighlighted: boolean;
  onClick: () => void;
}

function Badge({ label, isHighlighted, onClick }: BadgeProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-8 shrink-0 cursor-pointer items-center justify-center border-l text-[12px] font-semibold tabular-nums transition-colors',
        isHighlighted
          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
          : 'bg-muted/30 text-muted-foreground hover:bg-muted/60',
      )}
      aria-label={`group-${label}-highlight`}
      aria-pressed={isHighlighted}
      title={`그룹 ${label} 하이라이트 토글`}
    >
      {label}
    </button>
  );
}

export function CombinationList({ items, selectedIds, onToggle, onSetSelected }: Props) {
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());

  useEffect(() => {
    setHighlighted(new Set());
  }, [items]);

  const toggleHighlight = (key: string, groupIds: string[]) => {
    const willHighlight = !highlighted.has(key);
    setHighlighted((prev) => {
      const next = new Set(prev);
      if (willHighlight) next.add(key);
      else next.delete(key);
      return next;
    });
    onSetSelected(groupIds, willHighlight);
  };

  const manualItems = items.filter((it) => it.source === 'manual');
  const fileItems = items.filter((it) => it.source === 'file');
  const fileGroups = chunk(fileItems, GROUP_SIZE);
  const fileBaseIdx = manualItems.length;

  return (
    <div className="flex h-full w-full flex-col rounded-[4px] border bg-card">
      <ScrollArea className="flex-1">
        {items.length === 0 ? (
          <div className="flex h-full min-h-[260px] items-center justify-center p-4 text-center text-xs text-muted-foreground">
            파일 열기로 조합을 불러오세요.
          </div>
        ) : (
          <ul className="divide-y">
            {manualItems.length > 0 && (
              <li key="g_manual" className="flex items-stretch">
                <div className="min-w-0 flex-1 divide-y">
                  {manualItems.map((it, idx) => (
                    <Row
                      key={it.id}
                      item={it}
                      rowIdx={idx}
                      checked={selectedIds.has(it.id)}
                      isHighlighted={highlighted.has(MANUAL_KEY)}
                      onToggle={onToggle}
                    />
                  ))}
                </div>
                <Badge
                  label="M"
                  isHighlighted={highlighted.has(MANUAL_KEY)}
                  onClick={() =>
                    toggleHighlight(
                      MANUAL_KEY,
                      manualItems.map((it) => it.id),
                    )
                  }
                />
              </li>
            )}
            {fileGroups.map((group, groupIdx) => {
              const groupNum = groupIdx + 1;
              const key = `f_${groupNum}`;
              const isHighlighted = highlighted.has(key);
              return (
                <li key={key} className="flex items-stretch">
                  <div className="min-w-0 flex-1 divide-y">
                    {group.map((it, subIdx) => {
                      const rowIdx = fileBaseIdx + groupIdx * GROUP_SIZE + subIdx;
                      return (
                        <Row
                          key={it.id}
                          item={it}
                          rowIdx={rowIdx}
                          checked={selectedIds.has(it.id)}
                          isHighlighted={isHighlighted}
                          onToggle={onToggle}
                        />
                      );
                    })}
                  </div>
                  <Badge
                    label={groupNum.toString()}
                    isHighlighted={isHighlighted}
                    onClick={() =>
                      toggleHighlight(
                        key,
                        group.map((it) => it.id),
                      )
                    }
                  />
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>
    </div>
  );
}
