import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { CombinationItem } from '@/hooks/useCombinations';

interface Props {
  items: CombinationItem[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
}

function formatNumbers(nums: number[]): string {
  return nums.map((n) => n.toString().padStart(2, '0')).join(' ');
}

export function CombinationList({ items, selectedIds, onToggle }: Props) {
  return (
    <div className="flex h-full w-full flex-col rounded-[4px] border bg-card">
      <ScrollArea className="flex-1">
        {items.length === 0 ? (
          <div className="flex h-full min-h-[260px] items-center justify-center p-4 text-center text-xs text-muted-foreground">
            파일 열기로 조합을 불러오세요.
          </div>
        ) : (
          <ul className="divide-y">
            {items.map((it, idx) => {
              const checked = selectedIds.has(it.id);
              return (
                <li
                  key={it.id}
                  onClick={() => onToggle(it.id)}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 px-2 py-1 text-[12px] leading-none hover:bg-accent/40',
                    checked && 'bg-accent/60',
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => onToggle(it.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-3.5 w-3.5"
                    aria-label={`row-${idx + 1}-select`}
                  />
                  <span className="w-7 shrink-0 text-right text-muted-foreground tabular-nums">
                    {(idx + 1).toString().padStart(3, '0')}
                  </span>
                  <span className="font-mono text-foreground tabular-nums tracking-wider">
                    {formatNumbers(it.numbers)}
                  </span>
                  {it.source === 'manual' && (
                    <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                      [수동입력]
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>
    </div>
  );
}
