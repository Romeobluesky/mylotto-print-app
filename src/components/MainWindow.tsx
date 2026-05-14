import { useState } from 'react';
import { ButtonPanel } from './ButtonPanel';
import { CombinationList } from './CombinationList';
import { useCombinations } from '@/hooks/useCombinations';
import { useSettings } from '@/hooks/useSettings';
import { ipc } from '@/ipc/client';

export function MainWindow() {
  const { items, selectedIds, numbersOnly, replaceAll, toggle, removeSelected, removeAll } =
    useCombinations();
  const { settings, loaded } = useSettings();
  const [printing, setPrinting] = useState(false);
  const [status, setStatus] = useState<string>('준비됨');
  const [fileName, setFileName] = useState<string>('');

  async function handleOpenFile() {
    const res = await ipc.openFile();
    if (res.canceled) return;
    replaceAll(res.combinations);
    setFileName(res.filePath ?? '');
    setStatus(
      res.invalidLineCount > 0
        ? `${res.combinations.length}건 로드 (잘못된 줄 ${res.invalidLineCount}개 무시)`
        : `${res.combinations.length}건 로드`,
    );
  }

  async function handlePrint() {
    if (numbersOnly.length === 0) return;
    setPrinting(true);
    setStatus('인쇄 작업 전송 중...');
    try {
      const res = await ipc.print({ combinations: numbersOnly, settings });
      setStatus(res.success ? '인쇄 작업 전송 완료' : `인쇄 실패: ${res.error}`);
    } finally {
      setPrinting(false);
    }
  }

  function handleExit() {
    window.close();
  }

  async function handleOpenSettings() {
    await ipc.openSettingsWindow();
  }

  if (!loaded) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
        설정 로딩 중...
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-background px-3 pb-2 pt-2 text-sm">
      {/* 상단 정보 영역 */}
      <div className="mb-2 flex gap-2">
        <div className="min-w-0 flex-1 rounded-[4px] border bg-card px-2 py-1 text-[11px] leading-tight">
          <div className="text-muted-foreground">파일</div>
          <div className="truncate">{fileName || '—'}</div>
        </div>
        <div className="w-28 shrink-0 rounded-[4px] border bg-card px-2 py-1 text-[11px] leading-tight">
          <div className="text-muted-foreground">조합 / 선택</div>
          <div className="tabular-nums">
            {items.length} / {selectedIds.size}
          </div>
        </div>
      </div>

      {/* 본문: 리스트 + 버튼 패널 */}
      <div className="flex min-h-0 flex-1 gap-2">
        <div className="min-w-0 flex-1">
          <CombinationList items={items} selectedIds={selectedIds} onToggle={toggle} />
        </div>
        <ButtonPanel
          onOpenFile={handleOpenFile}
          onOpenSettings={handleOpenSettings}
          onPrint={handlePrint}
          onDeleteSelected={removeSelected}
          onDeleteAll={removeAll}
          onExit={handleExit}
          hasItems={items.length > 0}
          hasSelection={selectedIds.size > 0}
          isPrinting={printing}
        />
      </div>

      {/* 상태바 */}
      <footer className="mt-1.5 flex items-center justify-between border-t pt-1 text-[11px] text-muted-foreground">
        <span className="truncate">{status}</span>
        <span className="ml-2 shrink-0 truncate">
          {settings.printer || '프린터 미설정'}
        </span>
      </footer>
    </div>
  );
}
