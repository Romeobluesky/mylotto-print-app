import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  onOpenFile: () => void;
  onOpenManualInput: () => void;
  onOpenSettings: () => void;
  onPrint: () => void;
  onDeleteSelected: () => void;
  onDeleteAll: () => void;
  onExit: () => void;
  hasItems: boolean;
  hasSelection: boolean;
  isPrinting: boolean;
}

const baseBtn = 'h-8 w-full justify-center text-xs font-medium px-2';

export function ButtonPanel({
  onOpenFile,
  onOpenManualInput,
  onOpenSettings,
  onPrint,
  onDeleteSelected,
  onDeleteAll,
  onExit,
  hasItems,
  hasSelection,
  isPrinting,
}: Props) {
  return (
    <div className="flex w-28 shrink-0 flex-col gap-1.5">
      <Button variant="default" size="sm" onClick={onOpenFile} className={cn(baseBtn)}>
        파일 열기
      </Button>
      <Button variant="default" size="sm" onClick={onOpenManualInput} className={cn(baseBtn)}>
        수동입력
      </Button>
      <Button
        variant="default"
        size="sm"
        onClick={onPrint}
        disabled={!hasItems || isPrinting}
        className={cn(baseBtn)}
      >
        {isPrinting ? '인쇄 중...' : '인쇄 시작'}
      </Button>
      <Button variant="secondary" size="sm" onClick={onOpenSettings} className={cn(baseBtn)}>
        인쇄 설정
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onDeleteSelected}
        disabled={!hasSelection}
        className={cn(baseBtn)}
      >
        선택 삭제
      </Button>
      <div className="flex-1" />
      <Button
        variant="outline"
        size="sm"
        onClick={onDeleteAll}
        disabled={!hasItems}
        className={cn(baseBtn)}
      >
        전체 삭제
      </Button>
      <Button variant="ghost" size="sm" onClick={onExit} className={cn(baseBtn)}>
        종료
      </Button>
    </div>
  );
}
