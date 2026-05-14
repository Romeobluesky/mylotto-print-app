import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_SETTINGS, type AppSettings } from '@shared/index';
import { ipc } from '@/ipc/client';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    ipc.getSettings().then((s) => {
      setSettings(s);
      setLoaded(true);
    });
    const unsubscribe = ipc.onSettingsChanged((s) => setSettings(s));
    return unsubscribe;
  }, []);

  const save = useCallback(async (next: AppSettings) => {
    await ipc.setSettings(next);
    setSettings(next);
  }, []);

  return { settings, setSettings, save, loaded };
}
