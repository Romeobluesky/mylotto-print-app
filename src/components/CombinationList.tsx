import { useEffect, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { CombinationItem } from '@/hooks/useCombinations';

interface Props {
  items: CombinationItem[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
}

const GROUP_SIZE = 5;

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

export function CombinationList({ items, selectedIds, onToggle }: Props) {
  const [highlighted, setHighlighted] = useState<Set<number>>(new Set());

  useEffect(() => {
    setHighlighted(new Set());
  }, [items]);

  const toggleHighlight = (groupNum: number) => {
    setHighlighted((prev) => {
      const next = new Set(prev);
      if (next.has(groupNum)) next.delete(groupNum);
      else next.add(groupNum);
      return next;
    });
  };

  const groups = chunk(items, GROUP_SIZE);

  return (
    <div className="flex h-full w-full flex-col rounded-[4px] border bg-card">
      <ScrollArea className="flex-1">
        {items.length === 0 ? (
          <div className="flex h-full min-h-[260px] items-center justify-center p-4 text-center text-xs text-muted-foreground">
            파일 열기로 조합을 불러오세요.
          </div>
        ) : (
          <ul className="divide-y">
            {groups.map((group, groupIdx) => {
              const groupNum = groupIdx + 1;
              const isHighlighted = highlighted.has(groupNum);
              return (
                <li key={`g_${groupNum}`} className="flex items-stretch">
                  <div className="min-w-0 flex-1 divide-y">
                    {group.map((it, subIdx) => {
                      const checked = selectedIds.has(it.id);
                      const rowIdx = groupIdx * GROUP_SIZE + subIdx;
                      return (
                        <div
                          key={it.id}
                          onClick={() => onToggle(it.id)}
                          className={cn(
                            'flex cursor-pointer items-center gap-2 px-2 py-1 text-[12px] leading-none hover:bg-accent/40',
                            checked && 'bg-accent/60',
                            isHighlighted && 'bg-primary/15 hover:bg-primary/20',
                            isHighlighted && checked && 'bg-primary/25',
                          )}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => onToggle(it.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-3.5 w-3.5"
                            aria-label={`row-${rowIdx + 1}-select`}
                          />
                          <span className="w-7 shrink-0 text-right text-muted-foreground tabular-nums">
                            {(rowIdx + 1).toString().padStart(3, '0')}
                          </span>
                          <span className="font-mono text-foreground tabular-nums tracking-wider">
                            {formatNumbers(it.numbers)}
                          </span>
                          {it.source === 'manual' && (
                            <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                              [수동입력]
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleHighlight(groupNum)}
                    className={cn(
                      'flex w-8 shrink-0 cursor-pointer items-center justify-center border-l text-[12px] font-semibold tabular-nums transition-colors',
                      isHighlighted
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'bg-muted/30 text-muted-foreground hover:bg-muted/60',
                    )}
                    aria-label={`group-${groupNum}-highlight`}
                    aria-pressed={isHighlighted}
                    title={`그룹 ${groupNum} 하이라이트 토글`}
                  >
                    {groupNum}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>
    </div>
  );
}
