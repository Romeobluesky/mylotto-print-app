import { useEffect, useState } from 'react';
import { ButtonPanel } from './ButtonPanel';
import { CombinationList } from './CombinationList';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCombinations } from '@/hooks/useCombinations';
import { useSettings } from '@/hooks/useSettings';
import { ipc } from '@/ipc/client';

type ConfirmKind = 'selected' | 'all' | 'exit';

const APP_NAME = 'WinSpot OMR Marker';

export function MainWindow() {
  const {
    items,
    selectedIds,
    selectedNumbers,
    allSelected,
    replaceAll,
    prependManual,
    toggle,
    setSelected,
    selectAll,
    clearSelection,
    removeSelected,
    removeAll,
  } = useCombinations();
  const { settings, loaded } = useSettings();
  const [printing, setPrinting] = useState(false);
  const [status, setStatus] = useState<string>('준비됨');
  const [fileName, setFileName] = useState<string>('');
  const [confirmKind, setConfirmKind] = useState<ConfirmKind | null>(null);

  useEffect(() => {
    const off = ipc.onManualInputSubmit((groups) => {
      if (!groups || groups.length === 0) return;
      prependManual(groups);
      setStatus(`수동 입력 ${groups.length}건 추가`);
    });
    return off;
  }, [prependManual]);

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

  async function handlePrintSelected() {
    if (selectedNumbers.length === 0) return;
    setPrinting(true);
    setStatus(`선택 ${selectedNumbers.length}건 인쇄 작업 전송 중...`);
    try {
      const res = await ipc.print({ combinations: selectedNumbers, settings });
      setStatus(res.success ? '인쇄 작업 전송 완료' : `인쇄 실패: ${res.error}`);
    } finally {
      setPrinting(false);
    }
  }

  function handleToggleSelectAll(checked: boolean) {
    if (checked) selectAll();
    else clearSelection();
  }

  function handleConfirm() {
    if (confirmKind === 'selected') {
      const n = selectedIds.size;
      removeSelected();
      setStatus(`선택 ${n}건 삭제`);
    } else if (confirmKind === 'all') {
      const n = items.length;
      removeAll();
      setStatus(`전체 ${n}건 삭제`);
    } else if (confirmKind === 'exit') {
      window.close();
      return;
    }
    setConfirmKind(null);
  }

  function handleExit() {
    setConfirmKind('exit');
  }

  async function handleOpenSettings() {
    await ipc.openSettingsWindow();
  }

  async function handleOpenManualInput() {
    await ipc.openManualInputWindow();
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
          <CombinationList
            items={items}
            selectedIds={selectedIds}
            onToggle={toggle}
            onSetSelected={setSelected}
          />
        </div>
        <ButtonPanel
          onOpenFile={handleOpenFile}
          onOpenManualInput={handleOpenManualInput}
          onOpenSettings={handleOpenSettings}
          onPrintSelected={handlePrintSelected}
          onToggleSelectAll={handleToggleSelectAll}
          onDeleteSelected={() => setConfirmKind('selected')}
          onDeleteAll={() => setConfirmKind('all')}
          onExit={handleExit}
          hasItems={items.length > 0}
          hasSelection={selectedIds.size > 0}
          allSelected={allSelected}
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

      <Dialog open={confirmKind !== null} onOpenChange={(o) => !o && setConfirmKind(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {confirmKind === 'exit' ? '종료 확인' : '삭제 확인'}
            </DialogTitle>
            <DialogDescription>
              {confirmKind === 'selected' && '선택한 조합을 삭제 하시겠습니까?'}
              {confirmKind === 'all' && '전체 조합을 삭제 하시겠습니까?'}
              {confirmKind === 'exit' && `${APP_NAME}를 종료하시겠습니까?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setConfirmKind(null)}>
              취소
            </Button>
            <Button variant="destructive" size="sm" onClick={handleConfirm}>
              {confirmKind === 'exit' ? '종료' : '삭제'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
