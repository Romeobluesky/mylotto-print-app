import { useCallback, useMemo, useState } from 'react';

export type CombinationSource = 'file' | 'manual';

export interface CombinationItem {
  id: string;
  numbers: number[];
  source: CombinationSource;
}

let _seq = 0;
const nextId = () => `c_${Date.now()}_${++_seq}`;

export function useCombinations() {
  const [items, setItems] = useState<CombinationItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const addMany = useCallback((groups: number[][]) => {
    setItems((prev) => [
      ...prev,
      ...groups.map((numbers) => ({ id: nextId(), numbers, source: 'file' as const })),
    ]);
  }, []);

  const replaceAll = useCallback((groups: number[][]) => {
    setItems(groups.map((numbers) => ({ id: nextId(), numbers, source: 'file' as const })));
    setSelectedIds(new Set());
  }, []);

  const prependManual = useCallback((groups: number[][]) => {
    setItems((prev) => [
      ...groups.map((numbers) => ({ id: nextId(), numbers, source: 'manual' as const })),
      ...prev,
    ]);
  }, []);

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const removeSelected = useCallback(() => {
    setItems((prev) => prev.filter((it) => !selectedIds.has(it.id)));
    setSelectedIds(new Set());
  }, [selectedIds]);

  const removeAll = useCallback(() => {
    setItems([]);
    setSelectedIds(new Set());
  }, []);

  const numbersOnly = useMemo(() => items.map((it) => it.numbers), [items]);

  return {
    items,
    selectedIds,
    numbersOnly,
    addMany,
    replaceAll,
    prependManual,
    toggle,
    removeSelected,
    removeAll,
  };
}
