import {
  FolderOpen,
  LogOut,
  Pencil,
  Printer,
  Settings,
  Trash,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface Props {
  onOpenFile: () => void;
  onOpenManualInput: () => void;
  onOpenSettings: () => void;
  onPrintSelected: () => void;
  onToggleSelectAll: (checked: boolean) => void;
  onDeleteSelected: () => void;
  onDeleteAll: () => void;
  onExit: () => void;
  hasItems: boolean;
  hasSelection: boolean;
  allSelected: boolean;
  isPrinting: boolean;
}

const baseBtn = 'h-8 w-full justify-center gap-1.5 text-xs font-bold text-white px-2';
const iconCls = 'h-3.5 w-3.5 shrink-0';
const neutralDark = 'bg-slate-600 hover:bg-slate-700 text-white border-transparent';

export function ButtonPanel({
  onOpenFile,
  onOpenManualInput,
  onOpenSettings,
  onPrintSelected,
  onToggleSelectAll,
  onDeleteSelected,
  onDeleteAll,
  onExit,
  hasItems,
  hasSelection,
  allSelected,
  isPrinting,
}: Props) {
  return (
    <div className="flex w-28 shrink-0 flex-col gap-1.5">
      <Button variant="default" size="sm" onClick={onOpenFile} className={cn(baseBtn)}>
        <FolderOpen className={iconCls} />
        파일 열기
      </Button>
      <Button variant="default" size="sm" onClick={onOpenManualInput} className={cn(baseBtn)}>
        <Pencil className={iconCls} />
        수동 입력
      </Button>

      <Separator className="my-1" />

      <label
        className={cn(
          'flex h-8 w-full cursor-pointer items-center justify-start gap-1.5 rounded-[4px] border border-input bg-background px-2 text-xs font-medium',
          !hasItems && 'cursor-not-allowed opacity-50',
        )}
      >
        <Checkbox
          checked={allSelected}
          onCheckedChange={(v) => onToggleSelectAll(v === true)}
          disabled={!hasItems}
          className="h-3.5 w-3.5"
          aria-label="전체 선택"
        />
        <span>전체선택</span>
      </label>
      <Button
        variant="default"
        size="sm"
        onClick={onPrintSelected}
        disabled={!hasSelection || isPrinting}
        className={cn(baseBtn)}
      >
        <Printer className={iconCls} />
        {isPrinting ? '인쇄 중...' : '선택 인쇄'}
      </Button>

      <Separator className="my-1" />

      <Button
        variant="secondary"
        size="sm"
        onClick={onOpenSettings}
        className={cn(baseBtn, neutralDark)}
      >
        <Settings className={iconCls} />
        인쇄 설정
      </Button>
      <div className="flex-1" />
      <Button
        variant="destructive"
        size="sm"
        onClick={onDeleteSelected}
        disabled={!hasSelection}
        className={cn(baseBtn)}
      >
        <Trash2 className={iconCls} />
        선택 삭제
      </Button>
      <Button
        variant="destructive"
        size="sm"
        onClick={onDeleteAll}
        disabled={!hasItems}
        className={cn(baseBtn)}
      >
        <Trash className={iconCls} />
        전체 삭제
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onExit}
        className={cn(baseBtn, neutralDark)}
      >
        <LogOut className={iconCls} />
        종료
      </Button>
    </div>
  );
}
